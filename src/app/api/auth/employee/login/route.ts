// POST /api/auth/employee/login
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, hashPasswordServer, verifyPasswordServer } from '@/lib/server-auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

// Bug #14: Limpiar entradas expiradas cada 5 minutos para evitar memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();
function cleanupExpiredAttempts() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, val] of attempts.entries()) {
    if (val.lockedUntil < now && val.count === 0) {
      attempts.delete(key);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Usuario y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // Rate limiting
    const key = username.toLowerCase();
    cleanupExpiredAttempts(); // Bug #14: limpiar expirados
    const entry = attempts.get(key);
    if (entry && entry.lockedUntil > Date.now()) {
      const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { ok: false, error: `Demasiados intentos. Espera ${remaining}s.` },
        { status: 429 }
      );
    }

    // SQLite no soporta mode: 'insensitive', usamos equals directo (ya está lowercased)
    const employee = await db.employee.findFirst({
      where: {
        username: key,
        active: true,
      },
    });

    if (!employee || !verifyPasswordServer(password, employee.passwordHash)) {
      const current = attempts.get(key) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_MS;
        current.count = 0;
      }
      attempts.set(key, current);

      await db.activityLog.create({
        data: {
          userName: key,
          action: 'Intento de login fallido',
          detail: `Usuario: ${key}`,
        },
      });

      return NextResponse.json(
        { ok: false, error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    attempts.delete(key);

    // Migrar password legacy plain a hash si no está hasheado
    if (!employee.passwordHash.startsWith('pbkdf2$')) {
      const newHash = hashPasswordServer(password);
      await db.employee.update({
        where: { id: employee.id },
        data: { passwordHash: newHash },
      });
    }

    await createSession('employee', employee.id);

    await db.activityLog.create({
      data: {
        userId: employee.id,
        userName: employee.name,
        action: 'Inicio de sesión',
        detail: `Rol: ${employee.role}`,
      },
    });

    const { passwordHash, ...safeEmployee } = employee;
    // Parsear permissions de JSON string a objeto (bug #2)
    const employeeWithParsedPerms = {
      ...safeEmployee,
      permissions: typeof safeEmployee.permissions === 'string'
        ? JSON.parse(safeEmployee.permissions)
        : safeEmployee.permissions,
    };
    return NextResponse.json({ ok: true, employee: employeeWithParsedPerms });
  } catch (e: any) {
    console.error('Error en login de empleado:', e);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
