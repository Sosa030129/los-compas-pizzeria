// POST /api/whatsapp-numbers - crear (solo admin)
// PUT /api/whatsapp-numbers - actualizar (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.type !== 'employee' || s.employee.role !== 'admin') return null;
  return s;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { number, name, function: func, active } = await req.json();
  if (!number?.trim() || !name?.trim()) return NextResponse.json({ ok: false, error: 'Número y nombre obligatorios' }, { status: 400 });
  const wa = await db.whatsAppNumber.create({
    data: { number: number.trim(), name: name.trim(), function: func || 'pedidos', active: active !== false },
  });
  return NextResponse.json({ ok: true, whatsapp: wa });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
  const updated = await db.whatsAppNumber.update({ where: { id }, data: patch });
  return NextResponse.json({ ok: true, whatsapp: updated });
}
