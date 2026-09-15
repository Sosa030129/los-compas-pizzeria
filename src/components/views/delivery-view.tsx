'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { LogOut, Bike, MapPin, Phone, Package, User, Clock, Navigation } from 'lucide-react';
import { formatCUP, formatDateTime, getStateInfo, whatsappLink } from '@/lib/los-compas';
import { toast } from 'sonner';
import { useState } from 'react';

export function DeliveryView() {
  const currentEmployee = useStore((s) => s.currentEmployee);
  const logoutEmployee = useStore((s) => s.logoutEmployee);
  const setView = useStore((s) => s.setView);
  const orders = useStore((s) => s.orders);
  const employees = useStore((s) => s.employees);
  const setOrderState = useStore((s) => s.setOrderState);

  const [filter, setFilter] = useState<'assigned' | 'enroute' | 'delivered'>('assigned');

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (!currentEmployee) {
      setView('login');
    }
  }, [currentEmployee, setView]);

  if (!currentEmployee) return null;

  // Pedidos asignados a este repartidor
  const myOrders = orders.filter((o) =>
    o.assignedDelivery === currentEmployee.id ||
    (currentEmployee.role === 'repartidor' && ['camino', 'entregado'].includes(o.state))
  );

  const assigned = myOrders.filter((o) => o.state === 'camino' && !o.deliveredAt);
  const enroute = myOrders.filter((o) => o.state === 'camino');
  const delivered = myOrders.filter((o) => o.state === 'entregado');

  const list = filter === 'assigned' ? assigned : filter === 'enroute' ? enroute : delivered;

  return (
    <div className="animate-screen-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <Bike size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-cartoon text-base leading-tight">Panel Repartidor</h1>
            <p className="text-[11px] text-muted-foreground truncate">{currentEmployee.name}</p>
          </div>
          <button
            onClick={() => { logoutEmployee(); toast.success('Sesión cerrada'); }}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <LogOut size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3 max-w-3xl mx-auto">
          <Stat label="Asignados" value={assigned.length} emoji="📦" active={filter === 'assigned'} onClick={() => setFilter('assigned')} />
          <Stat label="En ruta" value={enroute.length} emoji="🛵" active={filter === 'enroute'} onClick={() => setFilter('enroute')} />
          <Stat label="Entregados" value={delivered.length} emoji="✅" active={filter === 'delivered'} onClick={() => setFilter('delivered')} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-6xl mb-3">🛵</div>
            <p className="text-sm">No tienes pedidos en esta categoría</p>
            <p className="text-xs mt-1">Cuando el administrador te asigne un pedido aparecerá aquí.</p>
          </div>
        ) : (
          list.map((o, idx) => {
            const st = getStateInfo(o.state);
            const customerMessage = `Hola ${o.customerName}, soy el repartidor de LOS COMPAS. Tu pedido ${o.code} está en camino. Total: ${formatCUP(o.total)} (${o.paymentMethod === 'efectivo' ? 'Pago en efectivo' : 'Transferencia'}).`;
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="cartoon-border bg-card rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-cartoon text-sm text-primary">{o.code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2"
                      style={{ backgroundColor: `${st.color}33`, color: st.color }}>
                      {st.emoji} {st.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-cartoon text-base text-primary">{formatCUP(o.total)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia'}
                    </p>
                  </div>
                </div>

                {/* Cliente */}
                <div className="space-y-1.5 text-sm bg-secondary/40 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-primary" />
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="ml-auto font-bold">{o.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-primary" />
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="ml-auto font-bold">{o.customerPhone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-primary mt-0.5" />
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="ml-auto text-right max-w-[60%]">{o.customerAddress}</span>
                  </div>
                  {o.reference && (
                    <div className="flex items-start gap-2">
                      <Navigation size={14} className="text-primary mt-0.5" />
                      <span className="text-muted-foreground">Referencia:</span>
                      <span className="ml-auto text-right max-w-[60%]">{o.reference}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-primary" />
                    <span className="text-muted-foreground">Entrega:</span>
                    <span className="ml-auto font-bold">{o.scheduledTime}</span>
                  </div>
                </div>

                {/* Items resumen */}
                <div className="mt-2 text-xs bg-secondary/30 rounded-xl p-2">
                  <p className="text-muted-foreground mb-1">{o.items.length} producto(s):</p>
                  {o.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span>{item.emoji}</span>
                      <span className="flex-1 truncate">{item.qty}× {item.name}</span>
                    </div>
                  ))}
                  {o.items.length > 3 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      +{o.items.length - 3} producto(s) más
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.state !== 'entregado' && (
                    <>
                      <a
                        href={whatsappLink(o.customerPhone, customerMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-700 text-white py-2.5 rounded-full font-bold text-xs text-center"
                      >
                        💬 Avisar por WhatsApp
                      </a>
                      <a
                        href={`tel:${o.customerPhone}`}
                        className="bg-secondary text-secondary-foreground py-2.5 px-4 rounded-full font-bold text-xs"
                      >
                        📞 Llamar
                      </a>
                    </>
                  )}
                  {o.state === 'camino' && (
                    <button
                      onClick={() => {
                        setOrderState(o.id, 'entregado');
                        toast.success('Pedido entregado correctamente');
                      }}
                      className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-full font-bold text-xs"
                    >
                      <Package size={14} className="inline mr-1" /> Marcar entregado
                    </button>
                  )}
                  {o.state === 'entregado' && (
                    <div className="flex-1 text-center py-2.5 text-xs text-green-400 font-bold">
                      ✓ Entregado {o.deliveredAt && `· ${formatDateTime(o.deliveredAt)}`}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, emoji, active, onClick }: {
  label: string; value: number; emoji: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl p-2 border-2 transition ${
        active ? 'border-primary bg-primary/10' : 'border-border bg-card'
      }`}
    >
      <div className="text-xl">{emoji}</div>
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </button>
  );
}
