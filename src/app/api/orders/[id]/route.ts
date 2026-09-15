// PATCH /api/orders/[id] - actualiza estado o domicilio del pedido
// Dispara WhatsApp automático según el evento
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';
import {
  notifyOrderConfirmed, notifyOrderReady, notifyOrderDelivered,
} from '@/lib/whatsapp';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'employee') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { state, delivery, assignedDeliveryId } = body;

    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ ok: false, error: 'Pedido no encontrado' }, { status: 404 });
    }

    const patch: any = {};

    if (state && state !== order.state) {
      // Validar transiciones permitidas
      const validStates = ['recibido', 'confirmado', 'preparando', 'listo', 'camino', 'entregado', 'cancelado'];
      if (!validStates.includes(state)) {
        return NextResponse.json({ ok: false, error: 'Estado inválido' }, { status: 400 });
      }
      patch.state = state;
      if (state === 'confirmado') patch.confirmedAt = new Date();
      if (state === 'entregado') patch.deliveredAt = new Date();
    }

    if (delivery !== undefined) {
      const safeDelivery = Math.max(0, Number.isFinite(delivery) ? delivery : 0);
      patch.delivery = safeDelivery;
    }

    if (assignedDeliveryId !== undefined) {
      // Validar que el empleado sea repartidor activo
      if (assignedDeliveryId) {
        const driver = await db.employee.findFirst({
          where: { id: assignedDeliveryId, active: true, role: 'repartidor' },
        });
        if (!driver) {
          return NextResponse.json({ ok: false, error: 'Repartidor inválido' }, { status: 400 });
        }
        patch.assignedDeliveryId = assignedDeliveryId;
        // Asignar automáticamente pasa a "camino"
        if (order.state === 'listo') patch.state = 'camino';
      }
    }

    // Recalcular total si cambió delivery
    if (patch.delivery !== undefined) {
      patch.total = Math.max(
        0,
        order.subtotal + order.extras - order.discount + patch.delivery + order.surcharge
      );
    }

    const updated = await db.order.update({
      where: { id },
      data: patch,
    });

    // Log de actividad
    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Cambio de estado',
        detail: `Pedido ${order.code}: ${patch.state || 'actualizado'}`,
      },
    });

    // ===== DISPARAR WHATSAPP AUTOMÁTICO SEGÚN EVENTO =====
    if (patch.state === 'confirmado') {
      await notifyOrderConfirmed({
        id: updated.id,
        code: updated.code,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        delivery: updated.delivery === null ? null : Number(updated.delivery),
        total: updated.total,
        scheduledTime: updated.scheduledTime,
      });
    } else if (patch.state === 'listo') {
      await notifyOrderReady({
        id: updated.id,
        code: updated.code,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
      });
    } else if (patch.state === 'entregado') {
      await notifyOrderDelivered({
        id: updated.id,
        code: updated.code,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
      });
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (e: any) {
    console.error('Error actualizando pedido:', e);
    return NextResponse.json({ ok: false, error: 'Error al actualizar pedido' }, { status: 500 });
  }
}
