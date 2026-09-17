// GET /api/branches - Listar sucursales
// POST /api/branches - Crear sucursal (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

export async function GET() {
  const branches = await db.branch.findMany({ where: { active: true } });
  return NextResponse.json({ ok: true, branches });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }
  const { name, address, phone } = await req.json();
  if (!name?.trim()) return NextResponse.json({ ok: false, error: 'Nombre obligatorio' }, { status: 400 });
  const branch = await db.branch.create({
    data: { name: name.trim(), address: address?.trim() || '', phone: phone?.trim() || '' },
  });
  return NextResponse.json({ ok: true, branch });
}
