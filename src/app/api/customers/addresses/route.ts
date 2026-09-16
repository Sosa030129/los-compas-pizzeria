// POST /api/customers/addresses - agregar dirección guardada
// DELETE /api/customers/addresses?index=0 - eliminar por índice
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

// POST - agregar nueva dirección
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'customer') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const { address, reference } = await req.json();
    if (!address?.trim()) {
      return NextResponse.json({ ok: false, error: 'Dirección obligatoria' }, { status: 400 });
    }

    const customer = await db.customer.findUnique({ where: { id: session.userId } });
    if (!customer) {
      return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
    }

    const addresses = JSON.parse(customer.addresses || '[]');
    addresses.push({ address: address.trim(), reference: reference?.trim() || '' });

    await db.customer.update({
      where: { id: session.userId },
      data: { addresses: JSON.stringify(addresses) },
    });

    return NextResponse.json({ ok: true, addresses });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

// DELETE - eliminar por índice
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'customer') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(req.url);
    const indexStr = url.searchParams.get('index');
    const index = indexStr ? parseInt(indexStr) : -1;
    if (isNaN(index) || index < 0) {
      return NextResponse.json({ ok: false, error: 'Índice inválido' }, { status: 400 });
    }

    const customer = await db.customer.findUnique({ where: { id: session.userId } });
    if (!customer) {
      return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
    }

    const addresses = JSON.parse(customer.addresses || '[]');
    if (index >= addresses.length) {
      return NextResponse.json({ ok: false, error: 'Índice fuera de rango' }, { status: 400 });
    }
    addresses.splice(index, 1);

    await db.customer.update({
      where: { id: session.userId },
      data: { addresses: JSON.stringify(addresses) },
    });

    return NextResponse.json({ ok: true, addresses });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
