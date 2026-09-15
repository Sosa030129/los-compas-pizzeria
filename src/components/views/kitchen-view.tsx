'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { LogOut, ChefHat, Clock, MapPin, Phone, Package } from 'lucide-react';
import { formatCUP, formatDateTime, formatTime, getStateInfo } from '@/lib/los-compas';
import { canAccessView } from '@/lib/auth';
import { toast } from 'sonner';
import { useState } from 'react';

export function KitchenView() {
  const currentEmployee = useStore((s) => s.currentEmployee);
  const logoutEmployee = useStore((s) => s.logoutEmployee);
  const setView = useStore((s) => s.setView);
  const orders = useStore((s) => s.orders);
  const sizes = useStore((s) => s.sizes);
  const ingredients = useStore((s) => s.ingredients);
  const setOrderState = useStore((s) => s.setOrderState);

  const [filter, setFilter] = useState<'pending' | 'preparing' | 'done'>('pending');

  // RBAC: redirigir si no tiene acceso a cocina
  useEffect(() => {
    if (!currentEmployee) {
      setView('login');
    } else if (!canAccessView(currentEmployee, 'kitchen')) {
      toast.error('No tienes permisos para acceder al panel de cocina');
      if (canAccessView(currentEmployee, 'admin')) setView('admin');
      else if (canAccessView(currentEmployee, 'delivery')) setView('delivery');
      else setView('home');
    }
  }, [currentEmployee, setView]);

  if (!currentEmployee) return null;
  if (!canAccessView(currentEmployee, 'kitchen')) return null;

  const pending = orders.filter((o) => ['confirmado', 'recibido'].includes(o.state));
  const preparing = orders.filter((o) => o.state === 'preparando');
  const done = orders.filter((o) => o.state === 'listo');

  const list = filter === 'pending' ? pending : filter === 'preparing' ? preparing : done;

  return (
    <div className="animate-screen-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <ChefHat size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-cartoon text-base leading-tight">Panel Cocina</h1>
            <p className="text-[11px] text-muted-foreground truncate">{currentEmployee.name}</p>
          </div>
          <button
            onClick={() => { logoutEmployee(); toast.success('Sesión cerrada'); }}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <LogOut size={16} />
          </button>
        </div>
        {/* Stats */}
        <div className="flex gap-2 mt-3 max-w-3xl mx-auto">
          <Stat label="Por preparar" value={pending.length} emoji="📋" active={filter === 'pending'} onClick={() => setFilter('pending')} />
          <Stat label="Preparando" value={preparing.length} emoji="👨‍🍳" active={filter === 'preparing'} onClick={() => setFilter('preparing')} />
          <Stat label="Listos" value={done.length} emoji="📦" active={filter === 'done'} onClick={() => setFilter('done')} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-6xl mb-3">🍽️</div>
            <p className="text-sm">No hay pedidos en esta cola</p>
          </div>
        ) : (
          list.map((o, idx) => {
            const st = getStateInfo(o.state);
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="cartoon-border bg-card rounded-2xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-cartoon text-sm text-primary">{o.code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${st.color}33`, color: st.color }}>
                        {st.emoji} {st.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <Clock size={11} className="inline mr-1" />
                      Entrega: {o.scheduledTime} · {formatTime(o.createdAt)} creado
                    </p>
                    {o.deliveryMode === 'domicilio' && (
                      <p className="text-[11px] text-muted-foreground">
                        <MapPin size={11} className="inline mr-1" />
                        {o.customerAddress}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      <Phone size={11} className="inline mr-1" />
                      {o.customerName} · {o.customerPhone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Pago</p>
                    <p className="text-xs font-bold">
                      {o.paymentMethod === 'efectivo' ? '💵' : '💳'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Total</p>
                    <p className="text-xs font-bold text-primary">{formatCUP(o.total)}</p>
                  </div>
                </div>

                {/* Items cocina */}
                <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Para preparar:</p>
                  {o.items.map((item, i) => {
                    const size = item.size ? sizes.find((s) => s.id === item.size) : null;
                    const ings = (item.ingredients || [])
                      .map((ci) => {
                        const ing = ingredients.find((x) => x.id === ci.ingredientId);
                        if (!ing) return null;
                        const qty = ci.qty === 'doble' ? ' (x2)' : ci.qty === 'triple' ? ' (x3)' : '';
                        return `${ing.name}${qty}`;
                      })
                      .filter(Boolean) as string[];
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm bg-card rounded-lg p-2">
                        <span className="text-xl">{item.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold leading-tight">
                            {item.qty}× {item.name}
                          </p>
                          {size && <p className="text-[11px] text-muted-foreground">{size.label}</p>}
                          {item.borderCheese && (
                            <p className="text-[11px] text-primary">🧀 Con borde de queso</p>
                          )}
                          {ings.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              <strong>Ingredientes:</strong> {ings.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {o.notes && (
                  <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-2 text-xs text-yellow-200">
                    📝 {o.notes}
                  </div>
                )}

                {/* Acciones cocina */}
                <div className="mt-3 flex gap-2">
                  {o.state === 'recibido' && (
                    <button
                      onClick={() => {
                        setOrderState(o.id, 'preparando');
                        toast.success('Preparación iniciada');
                      }}
                      className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-full font-bold text-xs"
                    >
                      👨‍🍳 Empezar a preparar
                    </button>
                  )}
                  {o.state === 'preparando' && (
                    <button
                      onClick={() => {
                        setOrderState(o.id, 'listo');
                        toast.success('Pedido listo para entrega');
                      }}
                      className="flex-1 bg-green-700 text-white py-2.5 rounded-full font-bold text-xs"
                    >
                      <Package size={14} className="inline mr-1" /> Marcar como listo
                    </button>
                  )}
                  {o.state === 'listo' && (
                    <div className="flex-1 text-center py-2.5 text-xs text-green-400 font-bold">
                      ✓ Listo - esperando entrega / repartidor
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
