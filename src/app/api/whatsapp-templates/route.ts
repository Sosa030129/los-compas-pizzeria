// GET/PUT /api/whatsapp-templates - gestión de plantillas de mensajes automáticos (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const templates = await db.whatsAppTemplate.findMany();
    return NextResponse.json({ ok: true, templates });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, template, active } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    }

    const updated = await db.whatsAppTemplate.update({
      where: { id },
      data: {
        ...(template !== undefined ? { template } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Plantilla WhatsApp actualizada',
        detail: updated.event,
      },
    });

    return NextResponse.json({ ok: true, template: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
