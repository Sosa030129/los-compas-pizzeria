// PATCH /api/orders/[id] - actualiza estado o domicilio del pedido
// Con máquina de estados válida (bug #9) y validación de rol (bug #25)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';
import {
  notifyOrderConfirmed, notifyOrderReady, notifyOrderDelivered,
} from '@/lib/whatsapp-cloud';
import { notifyOrderPush } from '@/lib/push-notifications';

// Máquina de estados: qué transiciones son válidas desde cada estado
const VALID_TRANSITIONS: Record<string, string[]> = {
  'recibido': ['confirmado', 'cancelado'],
  'confirmado': ['preparando', 'cancelado'],
  'preparando': ['listo', 'cancelado'],
  'listo': ['camino', 'entregado', 'cancelado'],
  'camino': ['entregado'],
  'entregado': [], // estado terminal
  'cancelado': [], // estado terminal
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'employee') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    // Parsear permissions si viene como string (bug #2)
    const perms = typeof session.employee.permissions === 'string'
      ? JSON.parse(session.employee.permissions)
      : session.employee.permissions;

    const { id } = await params;
    const body = await req.json();
    const { state, delivery, assignedDeliveryId } = body;

    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ ok: false, error: 'Pedido no encontrado' }, { status: 404 });
    }

    const patch: any = {};
    let stateChanged = false;

    if (state && state !== order.state) {
      // Validar transición (bug #9)
      const allowed = VALID_TRANSITIONS[order.state] || [];
      if (!allowed.includes(state)) {
        return NextResponse.json(
          { ok: false, error: `Transición inválida: ${order.state} → ${state}` },
          { status: 400 }
        );
      }

      // Validar permisos para cambio de estado (bug #25)
      const isAdmin = session.employee.role === 'admin';
      const canChangeState = isAdmin || perms?.cambiar_estados === true;
      if (!canChangeState) {
        return NextResponse.json({ ok: false, error: 'No tienes permisos para cambiar estados' }, { status: 403 });
      }

      patch.state = state;
      stateChanged = true;
      if (state === 'confirmado') patch.confirmedAt = new Date();
      if (state === 'entregado') patch.deliveredAt = new Date();
    }

    if (delivery !== undefined) {
      // Validar permisos para cambio de domicilio (bug #25)
      const isAdmin = session.employee.role === 'admin';
      const canChangeDelivery = isAdmin || perms?.gestionar_domicilio === true;
      if (!canChangeDelivery) {
        return NextResponse.json({ ok: false, error: 'No tienes permisos para cambiar domicilio' }, { status: 403 });
      }
      const safeDelivery = Math.max(0, Number.isFinite(delivery) ? delivery : 0);
      patch.delivery = safeDelivery;
    }

    if (assignedDeliveryId !== undefined) {
      // Solo admin puede asignar repartidores
      if (session.employee.role !== 'admin') {
        return NextResponse.json({ ok: false, error: 'Solo admin puede asignar repartidores' }, { status: 403 });
      }
      if (assignedDeliveryId) {
        const driver = await db.employee.findFirst({
          where: { id: assignedDeliveryId, active: true, role: 'repartidor' },
        });
        if (!driver) {
          return NextResponse.json({ ok: false, error: 'Repartidor inválido' }, { status: 400 });
        }
        patch.assignedDeliveryId = assignedDeliveryId;
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
        detail: `Pedido ${order.code}: ${patch.state || (patch.delivery !== undefined ? `domicilio=${patch.delivery}` : 'actualizado')}`,
      },
    });

    // WhatsApp: fire-and-forget según evento
    if (stateChanged) {
      if (patch.state === 'confirmado') {
        notifyOrderConfirmed({
          id: updated.id,
          code: updated.code,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone,
          delivery: updated.delivery === null ? null : Number(updated.delivery),
          total: updated.total,
          scheduledTime: updated.scheduledTime,
        }).catch(() => {});
        // FASE 3.6: Push notification al cliente
        notifyOrderPush(
          { customerId: updated.customerId ?? null, code: updated.code, customerName: updated.customerName },
          '✅ Pedido confirmado',
          `Tu pedido ${updated.code} fue confirmado. Total: ${updated.total} CUP`,
        ).catch(() => {});
      } else if (patch.state === 'listo') {
        notifyOrderReady({
          id: updated.id,
          code: updated.code,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone,
        }).catch(() => {});
        // FASE 3.6: Push notification al cliente
        notifyOrderPush(
          { customerId: updated.customerId ?? null, code: updated.code, customerName: updated.customerName },
          '📦 Tu pedido está listo',
          `Tu pedido ${updated.code} ya está listo para entrega/recogida.`,
        ).catch(() => {});
      } else if (patch.state === 'entregado') {
        notifyOrderDelivered({
          id: updated.id,
          code: updated.code,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone,
        }).catch(() => {});
        // FASE 3.6: Push notification al cliente
        notifyOrderPush(
          { customerId: updated.customerId ?? null, code: updated.code, customerName: updated.customerName },
          '🎉 Pedido entregado',
          `Tu pedido ${updated.code} fue entregado. ¡Gracias por comprar en LOS COMPAS!`,
        ).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (e: any) {
    console.error('Error actualizando pedido:', e);
    return NextResponse.json({ ok: false, error: 'Error al actualizar pedido' }, { status: 500 });
  }
}
