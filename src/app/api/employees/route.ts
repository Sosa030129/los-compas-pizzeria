// POST /api/employees - crear empleado (solo admin)
// PUT /api/employees - actualizar empleado (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';
import { hashPasswordServer } from '@/lib/server-auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  const { name, phone, username, password, role, permissions, active } = body;

  if (!name?.trim() || !username?.trim() || !password?.trim()) {
    return NextResponse.json({ ok: false, error: 'Nombre, usuario y contraseña son obligatorios' }, { status: 400 });
  }

  // Prevenir username duplicado
  const existing = await db.employee.findFirst({
    where: { username: { equals: username.trim().toLowerCase() } },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Ya existe un empleado con este usuario' }, { status: 409 });
  }

  const emp = await db.employee.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || '',
      username: username.trim().toLowerCase(),
      passwordHash: hashPasswordServer(password),
      role: role || 'personalizado',
      active: active !== false,
      permissions: JSON.stringify(permissions || {}),
    },
  });

  await db.activityLog.create({
    data: { userId: session.userId, userName: session.employee.name, action: 'Empleado creado', detail: name.trim() },
  });

  const { passwordHash, ...safe } = emp;
  return NextResponse.json({ ok: true, employee: { ...safe, permissions: JSON.parse(safe.permissions) } });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

  const existing = await db.employee.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });

  // Prevenir degradar al admin principal
  if (existing.role === 'admin' && patch.role && patch.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No se puede degradar al administrador principal' }, { status: 400 });
  }

  const data: any = {};
  if (patch.name) data.name = patch.name.trim();
  if (patch.phone !== undefined) data.phone = patch.phone?.trim() || '';
  if (patch.role) data.role = patch.role;
  if (patch.active !== undefined) data.active = !!patch.active;
  if (patch.permissions) data.permissions = JSON.stringify(patch.permissions);
  // Hash nueva password si se cambia
  if (patch.password && patch.password.trim()) {
    data.passwordHash = hashPasswordServer(patch.password);
  }

  const updated = await db.employee.update({ where: { id }, data });
  await db.activityLog.create({
    data: { userId: session.userId, userName: session.employee.name, action: 'Empleado actualizado', detail: updated.name },
  });

  const { passwordHash, ...safe } = updated;
  return NextResponse.json({ ok: true, employee: { ...safe, permissions: JSON.parse(safe.permissions) } });
}
