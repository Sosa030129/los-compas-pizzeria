'use client';

import type { Employee, Permission, Role } from '@/lib/types';

// Verifica si un empleado tiene acceso a una vista según su rol
export function canAccessView(employee: Employee | null, view: 'admin' | 'kitchen' | 'delivery'): boolean {
  if (!employee) return false;

  // Admin tiene acceso total
  if (employee.role === 'admin') return true;

  // Cocina puede ver cocina y admin solo si tiene permisos de dashboard
  if (employee.role === 'cocina') {
    return view === 'kitchen' || (view === 'admin' && employee.permissions.ver_dashboard);
  }

  // Repartidor puede ver reparto
  if (employee.role === 'repartidor') {
    return view === 'delivery' || (view === 'admin' && employee.permissions.ver_dashboard);
  }

  // Rol personalizado: requiere permisos específicos
  if (employee.role === 'personalizado') {
    if (view === 'admin') return employee.permissions.ver_dashboard;
    if (view === 'kitchen') return employee.permissions.ver_pedidos && employee.permissions.cambiar_estados;
    if (view === 'delivery') return employee.permissions.ver_pedidos;
  }

  return false;
}

// Verifica un permiso específico
export function hasPermission(employee: Employee | null, perm: keyof Permission): boolean {
  if (!employee) return false;
  if (employee.role === 'admin') return true;
  return employee.permissions[perm] === true;
}

// Valida formato de hora HH:MM
export function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(s);
}

// Valida que horaInicio < horaFin (formato HH:MM)
export function isTimeRangeValid(start: string, end: string): boolean {
  if (!isValidTime(start) || !isValidTime(end)) return false;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return sh * 60 + sm < eh * 60 + em;
}

// Rate limiting para login (memoria en módulo)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000; // 30s

export function checkLoginRateLimit(username: string): { allowed: boolean; remainingMs: number; remainingAttempts: number } {
  const entry = loginAttempts.get(username);
  if (entry && entry.lockedUntil > Date.now()) {
    return {
      allowed: false,
      remainingMs: entry.lockedUntil - Date.now(),
      remainingAttempts: 0,
    };
  }
  const count = entry?.count || 0;
  return {
    allowed: true,
    remainingMs: 0,
    remainingAttempts: MAX_ATTEMPTS - count,
  };
}

export function registerFailedLogin(username: string): void {
  const entry = loginAttempts.get(username) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0; // reset para próximo ciclo
  }
  loginAttempts.set(username, entry);
}

export function resetLoginAttempts(username: string): void {
  loginAttempts.delete(username);
}

// ===== Hashing de passwords con SubtleCrypto =====
// PBKDF2 with SHA-256, 10000 iterations, salt aleatorio
// Resultado: "pbkdf2$10000$<saltBase64>$<hashBase64>"

const ITERATIONS = 10000;
const SALT_LENGTH = 16; // bytes
const KEY_LENGTH = 32; // bytes

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  // En SSR o entornos sin crypto, fallback a hash simple (no seguro pero evita crash)
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return `plain$${password}`;
  }

  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const saltB64 = bufferToBase64(saltBytes.buffer);
  const hashB64 = bufferToBase64(hashBuffer);
  return `pbkdf2$${ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Soporta formato plain (legacy/demo)
  if (stored.startsWith('plain$')) {
    return password === stored.slice('plain$'.length);
  }
  // Formato pbkdf2$iterations$salt$hash
  if (stored.startsWith('pbkdf2$')) {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      return false; // no podemos verificar en SSR
    }
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iter = parseInt(parts[1]);
    const salt = base64ToBytes(parts[2]);
    const expectedHash = parts[3];
    const enc = new TextEncoder();
    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const hashBuffer = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt as BufferSource, iterations: iter, hash: 'SHA-256' },
        keyMaterial,
        KEY_LENGTH * 8
      );
      return bufferToBase64(hashBuffer) === expectedHash;
    } catch {
      return false;
    }
  }
  // Legacy: texto plano
  return password === stored;
}

// Helper síncrono para comparar en seed (seed usa plain, migración automática en primer login)
export function isHashedPassword(stored: string): boolean {
  return stored.startsWith('pbkdf2$') || stored.startsWith('plain$');
}
