// POST /api/auth/employee/login
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, hashPasswordServer, verifyPasswordServer } from '@/lib/server-auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

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
    return NextResponse.json({ ok: true, employee: safeEmployee });
  } catch (e: any) {
    console.error('Error en login de empleado:', e);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
