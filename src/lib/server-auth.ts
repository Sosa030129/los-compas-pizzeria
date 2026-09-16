// Helpers de autenticación del lado servidor (solo backend)
import { cookies } from 'next/headers';
import { db } from './db';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'los-compas-session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// Generar token aleatorio de 32 bytes (64 hex chars)
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// Crear sesión en BD y setear cookie httpOnly
export async function createSession(
  type: 'employee' | 'customer',
  userId: string
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      token,
      type,
      employeeId: type === 'employee' ? userId : null,
      customerId: type === 'customer' ? userId : null,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

// Obtener sesión actual desde cookie
export async function getSession(): Promise<
  | { type: 'employee'; userId: string; employee: any }
  | { type: 'customer'; userId: string; customer: any }
  | null
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      employee: true,
      customer: true,
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.type === 'employee' && session.employee) {
    // Bug #40: Sliding expiration - renovar sesión en cada uso
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    }).catch(() => {});
    return {
      type: 'employee',
      userId: session.employee.id,
      employee: session.employee,
    };
  }
  if (session.type === 'customer' && session.customer) {
    // Bug #40: Sliding expiration para clientes también
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    }).catch(() => {});
    return {
      type: 'customer',
      userId: session.customer.id,
      customer: session.customer,
    };
  }
  return null;
}

// Destruir sesión actual
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

// Hashing de passwords del lado servidor (PBKDF2 con crypto nativo de Node)
import { pbkdf2Sync, randomBytes as randomBytesFn } from 'crypto';

const ITERATIONS = 10000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

export function hashPasswordServer(password: string): string {
  const salt = randomBytesFn(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPasswordServer(password: string, stored: string): boolean {
  if (!stored.startsWith('pbkdf2$')) {
    // Legacy plain text (compatibilidad)
    return password === stored;
  }
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const iter = parseInt(parts[1]);
  const salt = Buffer.from(parts[2], 'base64');
  const expectedHash = parts[3];
  const hash = pbkdf2Sync(password, salt, iter, KEY_LENGTH, 'sha256');
  return hash.toString('base64') === expectedHash;
}
