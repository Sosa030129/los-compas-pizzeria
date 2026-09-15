// GET /api/orders - lista pedidos (empleado: todos, cliente: solo los suyos)
// POST /api/orders - crea nuevo pedido (desde checkout)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';
import { notifyNewOrder } from '@/lib/whatsapp';
import { randomBytes } from 'crypto';

function generateOrderCode(): string {
  return `LC-${randomBytes(2).toString('hex').toUpperCase().padStart(4, '0')}`;
}

// GET - listar pedidos
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    // Empleados ven todos los pedidos
    if (session.type === 'employee') {
      const orders = await db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return NextResponse.json({ ok: true, orders });
    }

    // Clientes solo ven sus pedidos
    if (session.type === 'customer') {
      const orders = await db.order.findMany({
        where: { customerId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ ok: true, orders });
    }

    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  } catch (e: any) {
    console.error('Error listando pedidos:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

// POST - crear pedido (público, no requiere sesión)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName, customerPhone, customerAddress, reference,
      items, subtotal, extras, delivery, discount, surcharge, total,
      paymentMethod, timeSlot, deliveryMode, scheduledTime, notes,
      customerId,
    } = body;

    // Validaciones básicas
    if (!customerName?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nombre es obligatorio' }, { status: 400 });
    }
    if (!customerPhone?.trim()) {
      return NextResponse.json({ ok: false, error: 'Teléfono es obligatorio' }, { status: 400 });
    }
    if (deliveryMode === 'domicilio' && !customerAddress?.trim()) {
      return NextResponse.json({ ok: false, error: 'Dirección es obligatoria para domicilio' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'El carrito está vacío' }, { status: 400 });
    }

    // Generar código único (verificar unicidad)
    let code = generateOrderCode();
    let attempts = 0;
    while (await db.order.findUnique({ where: { code } })) {
      code = generateOrderCode();
      attempts++;
      if (attempts > 10) break;
    }

    // Si hay sesión de cliente, asociar el pedido a la cuenta
    let resolvedCustomerId = customerId || null;
    const session = await getSession();
    if (session?.type === 'customer') {
      resolvedCustomerId = session.userId;
    }

    const order = await db.order.create({
      data: {
        code,
        customerId: resolvedCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: deliveryMode === 'domicilio'
          ? customerAddress.trim()
          : 'Recogida en tienda',
        reference: reference?.trim() || null,
        items: JSON.stringify(items),
        subtotal: Math.max(0, Number(subtotal) || 0),
        extras: Math.max(0, Number(extras) || 0),
        delivery: deliveryMode === 'domicilio' ? null : 0,
        discount: Math.max(0, Number(discount) || 0),
        surcharge: Math.max(0, Number(surcharge) || 0),
        total: Math.max(0, Number(total) || 0),
        paymentMethod,
        timeSlot,
        deliveryMode,
        scheduledTime,
        notes: notes?.trim() || null,
        state: 'recibido',
      },
    });

    // Log de actividad
    await db.activityLog.create({
      data: {
        userName: customerName.trim(),
        action: 'Nuevo pedido',
        detail: `Código ${code} - Total ${order.total} CUP`,
      },
    });

    // ===== DISPARAR WHATSAPP AUTOMÁTICO =====
    // Evento: nuevo pedido → notifica al admin/números de pedidos
    await notifyNewOrder({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      scheduledTime: order.scheduledTime,
    });

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    console.error('Error creando pedido:', e);
    return NextResponse.json({ ok: false, error: 'Error al crear pedido' }, { status: 500 });
  }
}
