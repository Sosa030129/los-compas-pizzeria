'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Package, Clock, MapPin, Phone, ChevronRight, Search } from 'lucide-react';
import {
  formatCUP, formatDateTime, getStateInfo, getOrderProgress,
} from '@/lib/los-compas';
import { useState } from 'react';
import { toast } from 'sonner';

export function TrackingView() {
  const orders = useStore((s) => s.orders);
  const selectedOrderId = useStore((s) => s.selectedOrderId);
  const setSelectedOrder = useStore((s) => s.setSelectedOrder);
  const setView = useStore((s) => s.setView);
  const currentEmployee = useStore((s) => s.currentEmployee);

  const [search, setSearch] = useState('');

  const myOrders = orders.filter((o) => {
    if (currentEmployee) return true;
    return true; // En modo demostración se ven todos
  });

  const filtered = search.trim()
    ? myOrders.filter((o) =>
        o.code.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone.includes(search)
      )
    : myOrders;

  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId)
    : null;

  if (selectedOrder) {
    return <OrderDetail orderId={selectedOrder.id} onBack={() => setSelectedOrder(null)} />;
  }

  return (
    <div className="animate-screen-enter pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-cartoon text-base mb-2">Mis pedidos</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre o teléfono..."
              className="bg-card border border-border rounded-full pl-10 pr-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-6xl mb-3">📦</div>
            <p className="text-sm mb-3">
              {orders.length === 0 ? 'Aún no has hecho pedidos' : 'Sin resultados'}
            </p>
            {orders.length === 0 && (
              <button
                onClick={() => setView('menu')}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-bold text-sm"
              >
                Hacer mi primer pedido
              </button>
            )}
          </div>
        ) : (
          filtered.map((o) => {
            const st = getStateInfo(o.state);
            const progress = getOrderProgress(o.state);
            return (
              <motion.button
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedOrder(o.id)}
                className="cartoon-border bg-card rounded-2xl p-4 w-full text-left hover:bg-accent/20 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-cartoon text-sm text-primary">{o.code}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${st.color}33`, color: st.color }}
                      >
                        {st.emoji} {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {o.items.length} producto(s) · {formatCUP(o.total)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      🕐 {o.scheduledTime} · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground shrink-0 mt-1" />
                </div>
                {/* Barra progreso */}
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: st.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}

function OrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const ingredients = useStore((s) => s.ingredients);
  const sizes = useStore((s) => s.sizes);
  const setView = useStore((s) => s.setView);

  if (!order) {
    return (
      <div className="p-4">
        <p>Pedido no encontrado</p>
        <button onClick={onBack} className="text-primary">Volver</button>
      </div>
    );
  }

  const st = getStateInfo(order.state);
  const progress = getOrderProgress(order.state);
  const states = ['recibido', 'confirmado', 'preparando', 'listo', 'camino', 'entregado'];

  return (
    <div className="animate-screen-enter pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="font-cartoon text-base flex-1">Pedido {order.code}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Estado visual */}
        <motion.div
          className="rounded-3xl p-5 text-center"
          style={{ backgroundColor: `${st.color}22`, border: `2px solid ${st.color}` }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="text-6xl mb-2"
          >
            {st.emoji}
          </motion.div>
          <h2 className="font-cartoon text-xl" style={{ color: st.color }}>{st.label}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {order.state === 'entregado'
              ? 'Pedido entregado. ¡Gracias por comprar en LOS COMPAS!'
              : order.state === 'camino'
                ? 'Tu pedido va en camino'
                : order.state === 'listo'
                  ? 'Tu pedido está listo'
                  : order.state === 'preparando'
                    ? 'Estamos preparando tu pedido'
                    : order.state === 'confirmado'
                      ? 'Pedido confirmado, pronto a preparar'
                      : 'Hemos recibido tu pedido'}
          </p>
        </motion.div>

        {/* Timeline */}
        {order.state !== 'cancelado' && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-cartoon text-sm mb-3">Estado del pedido</h3>
            <div className="relative">
              {/* Línea base */}
              <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-border" />
              {/* Línea progreso */}
              <motion.div
                className="absolute left-3 top-1 w-0.5 bg-primary"
                initial={{ height: 0 }}
                animate={{ height: `${(progress / 100) * (states.length * 40 - 8)}px` }}
                transition={{ duration: 0.6 }}
              />
              <div className="space-y-3">
                {states.map((s) => {
                  const info = getStateInfo(s);
                  const reached = states.indexOf(order.state) >= states.indexOf(s);
                  return (
                    <div key={s} className="flex items-center gap-3 relative">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 z-10 ${
                          reached ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {reached ? '✓' : info.emoji}
                      </span>
                      <span className={`text-xs ${reached ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        {info.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Detalle */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-cartoon text-sm mb-3">Productos</h3>
          <div className="space-y-2">
            {order.items.map((item, i) => {
              const size = item.size ? sizes.find((s) => s.id === item.size) : null;
              const ings = (item.ingredients || [])
                .map((ci) => {
                  const ing = ingredients.find((x) => x.id === ci.ingredientId);
                  if (!ing) return null;
                  const qty = ci.qty === 'doble' ? ' x2' : ci.qty === 'triple' ? ' x3' : '';
                  return `${ing.name}${qty}`;
                })
                .filter(Boolean) as string[];
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold leading-tight">
                      {item.qty}× {item.name}
                    </p>
                    {size && (
                      <p className="text-[11px] text-muted-foreground">
                        {size.label}{item.borderCheese ? ' · Borde queso' : ''}
                      </p>
                    )}
                    {ings.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">Extras: {ings.join(', ')}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {formatCUP((item.unitPrice + item.extrasTotal) * item.qty)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Datos entrega */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-cartoon text-sm mb-3">Datos de entrega</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Cliente:</span>
              <span className="ml-auto text-foreground">{order.customerName}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Teléfono:</span>
              <span className="ml-auto text-foreground">{order.customerPhone}</span>
            </div>
            {order.deliveryMode === 'domicilio' && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Dirección:</span>
                <span className="ml-auto text-foreground text-right max-w-[60%]">{order.customerAddress}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Entrega:</span>
              <span className="ml-auto text-foreground">{order.scheduledTime}</span>
            </div>
            <div className="flex items-start gap-2">
              <Package size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Pago:</span>
              <span className="ml-auto text-foreground">
                {order.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}
              </span>
            </div>
          </div>
          {order.notes && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-1">Notas:</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="bg-card rounded-2xl border-2 border-primary/30 p-4">
          <h3 className="font-cartoon text-sm mb-2">Resumen</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{formatCUP(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Extras</span><span>{formatCUP(order.extras)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Domicilio</span>
              <span>
                {order.delivery === null ? 'Pendiente' : formatCUP(order.delivery)}
              </span>
            </div>
            <div className="flex justify-between font-cartoon text-base text-primary border-t border-border pt-2 mt-2">
              <span>Total</span><span>{formatCUP(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('menu')}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-full font-bold text-sm hover:opacity-95 animate-button-pop"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    </div>
  );
}
