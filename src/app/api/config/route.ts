// PUT /api/config - actualizar configuración del negocio (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(s);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const { name, city, currency, logo, phone, address, deliveryBase,
    morningStart, morningEnd, morningDelivery, afternoonStart, afternoonEnd,
    afternoonDelivery, transferSurcharge } = body;

  // Validar horarios
  const times = [morningStart, morningEnd, afternoonStart, afternoonEnd].filter(Boolean);
  for (const t of times) {
    if (!isValidTime(t)) {
      return NextResponse.json({ ok: false, error: `Horario inválido: ${t}. Debe ser HH:MM` }, { status: 400 });
    }
  }
  if (transferSurcharge !== undefined && (transferSurcharge < 0 || transferSurcharge > 1)) {
    return NextResponse.json({ ok: false, error: 'Recargo debe estar entre 0 y 1' }, { status: 400 });
  }
  if (deliveryBase !== undefined && deliveryBase < 0) {
    return NextResponse.json({ ok: false, error: 'Domicilio no puede ser negativo' }, { status: 400 });
  }

  const data: any = {};
  if (name) data.name = name.trim();
  if (city) data.city = city.trim();
  if (currency) data.currency = currency.trim();
  if (logo) data.logo = logo.trim();
  if (phone !== undefined) data.phone = phone?.trim() || '';
  if (address !== undefined) data.address = address?.trim() || '';
  if (deliveryBase !== undefined) data.deliveryBase = Math.max(0, Math.floor(deliveryBase));
  if (morningStart !== undefined) data.morningStart = morningStart;
  if (morningEnd !== undefined) data.morningEnd = morningEnd;
  if (morningDelivery !== undefined) data.morningDelivery = morningDelivery;
  if (afternoonStart !== undefined) data.afternoonStart = afternoonStart;
  if (afternoonEnd !== undefined) data.afternoonEnd = afternoonEnd;
  if (afternoonDelivery !== undefined) data.afternoonDelivery = afternoonDelivery;
  if (transferSurcharge !== undefined) data.transferSurcharge = transferSurcharge;

  const updated = await db.businessConfig.update({ where: { id: '1' }, data });
  await db.activityLog.create({
    data: { userId: session.userId, userName: session.employee.name, action: 'Configuración actualizada', detail: '' },
  });
  return NextResponse.json({ ok: true, config: updated });
}
