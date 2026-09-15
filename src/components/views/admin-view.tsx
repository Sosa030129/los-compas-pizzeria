'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, Salad, Users, MessageCircle, Settings, LogOut,
  ShoppingBag, Plus, Pencil, Trash2, Save, AlertTriangle,
  Bike, History, Tags,
} from 'lucide-react';
import {
  formatCUP, formatDateTime, getStateInfo, uid,
} from '@/lib/los-compas';
import { toast } from 'sonner';
import type { Product, Employee, WhatsAppNumber, Permission, Role, Ingredient } from '@/lib/types';

type AdminTab = 'dashboard' | 'orders' | 'products' | 'ingredients' | 'categories' | 'employees' | 'whatsapp' | 'config' | 'logs';

export function AdminView() {
  const currentEmployee = useStore((s) => s.currentEmployee);
  const logoutEmployee = useStore((s) => s.logoutEmployee);
  const setView = useStore((s) => s.setView);
  const [tab, setTab] = useState<AdminTab>('dashboard');

  if (!currentEmployee) {
    setView('login');
    return null;
  }

  const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'ingredients', label: 'Ingredientes', icon: Salad },
    { id: 'categories', label: 'Categorías', icon: Tags },
    { id: 'employees', label: 'Empleados', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'config', label: 'Configuración', icon: Settings },
    { id: 'logs', label: 'Historial', icon: History },
  ];

  return (
    <div className="animate-screen-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <img src="/icon.svg" alt="Logo" className="w-9 h-9 rounded-full" />
          <div className="flex-1 min-w-0">
            <h1 className="font-cartoon text-base leading-tight">Panel Admin</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentEmployee.name} · {currentEmployee.role}
            </p>
          </div>
          <button
            onClick={() => { logoutEmployee(); toast.success('Sesión cerrada'); }}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto mt-3 -mx-4 px-4 max-w-3xl mx-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {tab === 'dashboard' && <DashboardTab onNavigate={setTab} />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'ingredients' && <IngredientsTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'employees' && <EmployeesTab />}
        {tab === 'whatsapp' && <WhatsAppTab />}
        {tab === 'config' && <ConfigTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}

// ===== Dashboard =====
function DashboardTab({ onNavigate }: { onNavigate: (t: AdminTab) => void }) {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const ingredients = useStore((s) => s.ingredients);

  const stats = {
    nuevos: orders.filter((o) => o.state === 'recibido').length,
    preparando: orders.filter((o) => o.state === 'preparando').length,
    listos: orders.filter((o) => o.state === 'listo').length,
    reparto: orders.filter((o) => o.state === 'camino').length,
    entregados: orders.filter((o) => o.state === 'entregado').length,
    cancelados: orders.filter((o) => o.state === 'cancelado').length,
    ventas: orders.filter((o) => o.state === 'entregado').reduce((sum, o) => sum + o.total, 0),
    agotados: products.filter((p) => !p.available).length,
    ingredientesBaja: ingredients.filter((i) => !i.available).length,
  };

  const recent = orders.slice(0, 5);
  const topProducts = products
    .map((p) => {
      const count = orders.flatMap((o) => o.items).filter((i) => i.productId === p.id).reduce((s, i) => s + i.qty, 0);
      return { p, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Pedidos hoy" value={orders.length} emoji="📋" />
        <Stat label="Ventas entr." value={formatCUP(stats.ventas)} emoji="💰" small />
        <Stat label="Nuevos" value={stats.nuevos} emoji="🆕" highlight={stats.nuevos > 0} />
        <Stat label="En reparto" value={stats.reparto} emoji="🛵" />
      </div>

      {/* Estados */}
      <div className="cartoon-border bg-card rounded-2xl p-4">
        <h3 className="font-cartoon text-sm mb-3">Estados actuales</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Recibidos', value: stats.nuevos, color: '#8a7a5a' },
            { label: 'Preparando', value: stats.preparando, color: '#d49050' },
            { label: 'Listos', value: stats.listos, color: '#7ab860' },
            { label: 'En camino', value: stats.reparto, color: '#5a9ab8' },
            { label: 'Entregados', value: stats.entregados, color: '#7a1f2b' },
            { label: 'Cancelados', value: stats.cancelados, color: '#7a1f1f' },
          ].map((s) => (
            <div key={s.label} className="bg-secondary/50 rounded-xl p-2">
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {(stats.agotados > 0 || stats.ingredientesBaja > 0 || stats.nuevos > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <h3 className="font-cartoon text-sm mb-2 flex items-center gap-1.5 text-yellow-400">
            <AlertTriangle size={14} /> Alertas
          </h3>
          <ul className="text-xs text-yellow-200 space-y-1">
            {stats.nuevos > 0 && (
              <li>
                📋 Tienes <strong>{stats.nuevos}</strong> pedido(s) nuevo(s) sin confirmar{' '}
                <button onClick={() => onNavigate('orders')} className="underline text-yellow-300">ver →</button>
              </li>
            )}
            {stats.agotados > 0 && <li>📦 {stats.agotados} producto(s) agotado(s)</li>}
            {stats.ingredientesBaja > 0 && <li>🥬 {stats.ingredientesBaja} ingrediente(s) sin stock</li>}
          </ul>
        </div>
      )}

      {/* Pedidos recientes */}
      <div className="cartoon-border bg-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-cartoon text-sm">Pedidos recientes</h3>
          <button onClick={() => onNavigate('orders')} className="text-xs text-primary font-bold hover:underline">
            Ver todo →
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin pedidos todavía</p>
        ) : (
          <div className="space-y-2">
            {recent.map((o) => {
              const st = getStateInfo(o.state);
              return (
                <button
                  key={o.id}
                  onClick={() => onNavigate('orders')}
                  className="w-full flex items-center gap-3 text-left hover:bg-accent/20 rounded-xl p-2"
                >
                  <span className="font-bold text-xs text-primary w-16">{o.code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{o.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${st.color}33`, color: st.color }}>
                    {st.emoji} {st.label}
                  </span>
                  <span className="text-xs font-bold">{formatCUP(o.total)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Top productos */}
      <div className="cartoon-border bg-card rounded-2xl p-4">
        <h3 className="font-cartoon text-sm mb-3">Productos más vendidos</h3>
        {topProducts.every((p) => p.count === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin ventas registradas</p>
        ) : (
          <div className="space-y-1.5">
            {topProducts.filter((p) => p.count > 0).map(({ p, count }) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{p.emoji}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs font-bold text-primary">{count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, emoji, highlight, small }: {
  label: string; value: string | number; emoji: string; highlight?: boolean; small?: boolean;
}) {
  return (
    <div className={`cartoon-border bg-card rounded-2xl p-3 ${highlight ? 'border-primary' : ''}`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className={`font-cartoon ${small ? 'text-sm' : 'text-base'} text-primary`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ===== Pedidos =====
function OrdersTab() {
  const orders = useStore((s) => s.orders);
  const setOrderState = useStore((s) => s.setOrderState);
  const setOrderDelivery = useStore((s) => s.setOrderDelivery);
  const assignDelivery = useStore((s) => s.assignDelivery);
  const employees = useStore((s) => s.employees);
  const sizes = useStore((s) => s.sizes);

  const [filter, setFilter] = useState<string>('all');
  const [editDelivery, setEditDelivery] = useState<string | null>(null);
  const [deliveryInput, setDeliveryInput] = useState('');

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.state === filter);
  const repartidores = employees.filter((e) => e.role === 'repartidor' && e.active);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto -mx-4 px-4">
        {['all', 'recibido', 'confirmado', 'preparando', 'listo', 'camino', 'entregado', 'cancelado'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
              filter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {s === 'all' ? 'Todos' : getStateInfo(s).label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No hay pedidos en este estado</p>
        </div>
      ) : (
        filtered.map((o) => {
          const st = getStateInfo(o.state);
          return (
            <div key={o.id} className="cartoon-border bg-card rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cartoon text-sm text-primary">{o.code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${st.color}33`, color: st.color }}>
                      {st.emoji} {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.customerName} · {o.customerPhone}
                  </p>
                  {o.deliveryMode === 'domicilio' && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">📍 {o.customerAddress}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">🕐 {o.scheduledTime}</p>
                </div>
                <div className="text-right">
                  <p className="font-cartoon text-base text-primary">{formatCUP(o.total)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {o.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 mb-3 bg-secondary/40 rounded-xl p-2">
                {o.items.map((item, i) => {
                  const size = item.size ? sizes.find((s) => s.id === item.size) : null;
                  return (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <span>{item.emoji}</span>
                      <span className="flex-1">
                        {item.qty}× {item.name}
                        {size && ` · ${size.label}`}
                        {item.borderCheese && ' · Borde queso'}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCUP((item.unitPrice + item.extrasTotal) * item.qty)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Domicilio */}
              {o.deliveryMode === 'domicilio' && (
                <div className="bg-secondary/40 rounded-xl p-2 mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Domicilio</span>
                  {editDelivery === o.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={deliveryInput}
                        onChange={(e) => setDeliveryInput(e.target.value)}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const v = parseInt(deliveryInput);
                          if (!isNaN(v) && v >= 0) {
                            setOrderDelivery(o.id, v);
                            toast.success(`Domicilio actualizado: ${formatCUP(v)}`);
                          }
                          setEditDelivery(null);
                        }}
                        className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditDelivery(null)}
                        className="bg-secondary px-2 py-1 rounded text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDeliveryInput(String(o.delivery ?? 0));
                        setEditDelivery(o.id);
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {o.delivery === null ? 'Pendiente — Click para confirmar' : formatCUP(o.delivery)}
                    </button>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap gap-1.5">
                {o.state === 'recibido' && (
                  <button
                    onClick={() => {
                      setOrderState(o.id, 'confirmado');
                      toast.success('Pedido confirmado');
                    }}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    ✓ Confirmar
                  </button>
                )}
                {o.state === 'confirmado' && (
                  <button
                    onClick={() => {
                      setOrderState(o.id, 'preparando');
                      toast.success('Marcado como preparando');
                    }}
                    className="bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    👨‍🍳 Iniciar preparación
                  </button>
                )}
                {o.state === 'preparando' && (
                  <button
                    onClick={() => {
                      setOrderState(o.id, 'listo');
                      toast.success('Pedido listo');
                    }}
                    className="bg-green-700 text-white px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    📦 Listo
                  </button>
                )}
                {o.state === 'listo' && o.deliveryMode === 'domicilio' && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        assignDelivery(o.id, e.target.value);
                        toast.success('Repartidor asignado');
                      }
                    }}
                    defaultValue=""
                    className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-bold border border-border"
                  >
                    <option value="">Asignar repartidor...</option>
                    {repartidores.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}
                {o.state === 'listo' && o.deliveryMode === 'recogida' && (
                  <button
                    onClick={() => {
                      setOrderState(o.id, 'entregado');
                      toast.success('Pedido entregado');
                    }}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    🎉 Entregar
                  </button>
                )}
                {o.state !== 'entregado' && o.state !== 'cancelado' && (
                  <button
                    onClick={() => {
                      setOrderState(o.id, 'cancelado');
                      toast('Pedido cancelado');
                    }}
                    className="bg-destructive/20 text-destructive px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    ✕ Cancelar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ===== Productos =====
function ProductsTab() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const saveProduct = useStore((s) => s.saveProduct);
  const toggleAvailable = useStore((s) => s.toggleProductAvailable);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [editing, setEditing] = useState<Product | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => { setEditing(null); setShowNew(true); }}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
      >
        <Plus size={16} /> Nuevo producto
      </button>

      {categories.map((cat) => {
        const items = products.filter((p) => p.category === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id}>
            <h3 className="font-cartoon text-sm mb-2 mt-3 flex items-center gap-2">
              <span>{cat.emoji}</span> {cat.name}
              <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
            </h3>
            <div className="space-y-1.5">
              {items.map((p) => (
                <div key={p.id} className={`cartoon-border bg-card rounded-xl p-3 flex items-center gap-3 ${!p.available ? 'opacity-60' : ''}`}>
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.isPizza ? 'Desde ' : ''}{formatCUP(p.price)} · {p.prepTime} min
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAvailable(p.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.available ? 'bg-green-700/30 text-green-400' : 'bg-destructive/20 text-destructive'}`}
                  >
                    {p.available ? '✓ Disp.' : 'Agotado'}
                  </button>
                  <button
                    onClick={() => { setEditing(p); setShowNew(true); }}
                    className="bg-secondary w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar ${p.name}?`)) {
                        deleteProduct(p.id);
                        toast.success('Producto eliminado');
                      }
                    }}
                    className="bg-destructive/20 text-destructive w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {(showNew || editing) && (
        <ProductForm
          initial={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSave={(p) => {
            saveProduct(p);
            toast.success(editing ? 'Producto actualizado' : 'Producto creado');
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductForm({ initial, onClose, onSave }: {
  initial: Product | null;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const categories = useStore((s) => s.categories);
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [category, setCategory] = useState(initial?.category || categories[0]?.id || 'pizzas');
  const [emoji, setEmoji] = useState(initial?.emoji || '🍕');
  const [price, setPrice] = useState(initial?.price || 0);
  const [prepTime, setPrepTime] = useState(initial?.prepTime || 15);
  const [isPizza, setIsPizza] = useState(initial?.isPizza || false);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border max-h-[85vh] overflow-y-auto">
        <h3 className="font-cartoon text-base mb-3">{initial ? 'Editar producto' : 'Nuevo producto'}</h3>
        <div className="space-y-3">
          <FormRow label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Descripción">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm min-h-[60px]" />
          </FormRow>
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Emoji">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
            </FormRow>
            <FormRow label="Categoría">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormRow>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Precio (CUP)">
              <input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
            </FormRow>
            <FormRow label="Tiempo prep (min)">
              <input type="number" value={prepTime} onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
            </FormRow>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPizza} onChange={(e) => setIsPizza(e.target.checked)} />
            Es una pizza (constructor visual)
          </label>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-secondary py-2.5 rounded-xl font-bold text-sm">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!name.trim()) {
                  toast.error('El nombre es obligatorio');
                  return;
                }
                onSave({
                  id: initial?.id || uid('prod'),
                  name: name.trim(),
                  description: description.trim(),
                  category,
                  emoji,
                  price: isPizza ? 0 : price,
                  available: true,
                  prepTime,
                  isPizza,
                  defaultSize: isPizza ? 'familiar_42x30' : undefined,
                  defaultIngredients: isPizza ? ['queso'] : undefined,
                });
              }}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm"
            >
              <Save size={14} className="inline mr-1" /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Ingredientes =====
function IngredientsTab() {
  const ingredients = useStore((s) => s.ingredients);
  const sizes = useStore((s) => s.sizes);
  const saveIngredient = useStore((s) => s.saveIngredient);
  const toggleAvailable = useStore((s) => s.toggleIngredientAvailable);
  const deleteIngredient = useStore((s) => s.deleteIngredient);

  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => { setEditing(null); setShowNew(true); }}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
      >
        <Plus size={16} /> Nuevo ingrediente
      </button>

      <div className="space-y-1.5">
        {ingredients.map((i) => (
          <div key={i.id} className={`cartoon-border bg-card rounded-xl p-3 ${!i.available ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{i.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Peq: {formatCUP(i.priceBySize.pequena_20 || 0)} · Fam: {formatCUP(i.priceBySize.familiar_42x30 || 0)}
                </p>
              </div>
              <button
                onClick={() => toggleAvailable(i.id)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${i.available ? 'bg-green-700/30 text-green-400' : 'bg-destructive/20 text-destructive'}`}
              >
                {i.available ? '✓' : 'Agotado'}
              </button>
              <button onClick={() => { setEditing(i); setShowNew(true); }} className="bg-secondary w-8 h-8 rounded-full flex items-center justify-center">
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar ${i.name}?`)) {
                    deleteIngredient(i.id);
                    toast.success('Ingrediente eliminado');
                  }
                }}
                className="bg-destructive/20 text-destructive w-8 h-8 rounded-full flex items-center justify-center"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showNew || editing) && (
        <IngredientForm
          initial={editing}
          sizes={sizes}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSave={(ing) => {
            saveIngredient(ing);
            toast.success(editing ? 'Ingrediente actualizado' : 'Ingrediente creado');
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function IngredientForm({ initial, sizes, onClose, onSave }: {
  initial: Ingredient | null;
  sizes: { id: string; label: string }[];
  onClose: () => void;
  onSave: (i: Ingredient) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '🧀');
  const [color, setColor] = useState(initial?.color || '#ffd966');
  const [prices, setPrices] = useState<Record<string, number>>(
    initial?.priceBySize as Record<string, number> || {}
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border max-h-[85vh] overflow-y-auto">
        <h3 className="font-cartoon text-base mb-3">{initial ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h3>
        <div className="space-y-3">
          <FormRow label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Emoji">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
            </FormRow>
            <FormRow label="Color (visualizador)">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-9 bg-background border border-border rounded-xl" />
            </FormRow>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-1">Precio por tamaño (CUP):</p>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((s) => (
                <label key={s.id} className="text-xs">
                  <span className="text-muted-foreground block">{s.label}</span>
                  <input
                    type="number"
                    value={prices[s.id] || 0}
                    onChange={(e) => setPrices({ ...prices, [s.id]: parseInt(e.target.value) || 0 })}
                    className="bg-background border border-border rounded px-2 py-1 w-full text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-secondary py-2.5 rounded-xl font-bold text-sm">Cancelar</button>
            <button
              onClick={() => {
                if (!name.trim()) {
                  toast.error('El nombre es obligatorio');
                  return;
                }
                onSave({
                  id: initial?.id || uid('ing'),
                  name: name.trim(),
                  emoji,
                  color,
                  priceBySize: prices,
                  available: true,
                });
              }}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm"
            >
              <Save size={14} className="inline mr-1" /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Categorías =====
function CategoriesTab() {
  const categories = useStore((s) => s.categories);
  const saveCategory = useStore((s) => s.saveCategory);
  const toggleVisible = useStore((s) => s.toggleCategoryVisible);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍕');

  return (
    <div className="space-y-3">
      <div className="cartoon-border bg-card rounded-2xl p-4">
        <h3 className="font-cartoon text-sm mb-2">Nueva categoría</h3>
        <div className="flex gap-2">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 bg-background border border-border rounded-xl px-2 py-2 text-sm text-center" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre categoría" className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm" />
          <button
            onClick={() => {
              if (!name.trim()) {
                toast.error('Nombre obligatorio');
                return;
              }
              saveCategory({
                id: uid('cat'),
                name: name.trim(),
                emoji,
                visible: true,
                order: categories.length + 1,
              });
              setName('');
              setEmoji('🍕');
              toast.success('Categoría creada');
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-sm"
          >
            Agregar
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {categories.slice().sort((a, b) => a.order - b.order).map((c) => (
          <div key={c.id} className="cartoon-border bg-card rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">{c.emoji}</span>
            <span className="flex-1 font-bold text-sm">{c.name}</span>
            <button
              onClick={() => toggleVisible(c.id)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.visible ? 'bg-green-700/30 text-green-400' : 'bg-muted-foreground/20 text-muted-foreground'}`}
            >
              {c.visible ? 'Visible' : 'Oculta'}
            </button>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar ${c.name}?`)) {
                  deleteCategory(c.id);
                  toast.success('Categoría eliminada');
                }
              }}
              className="bg-destructive/20 text-destructive w-8 h-8 rounded-full flex items-center justify-center"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Empleados =====
function EmployeesTab() {
  const employees = useStore((s) => s.employees);
  const saveEmployee = useStore((s) => s.saveEmployee);
  const toggleActive = useStore((s) => s.toggleEmployeeActive);
  const deleteEmployee = useStore((s) => s.deleteEmployee);

  const [editing, setEditing] = useState<Employee | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => { setEditing(null); setShowNew(true); }}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
      >
        <Plus size={16} /> Nuevo empleado
      </button>

      <div className="space-y-1.5">
        {employees.map((e) => (
          <div key={e.id} className={`cartoon-border bg-card rounded-xl p-3 ${!e.active ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {e.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">@{e.username} · {e.role}</p>
              </div>
              <button
                onClick={() => toggleActive(e.id)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${e.active ? 'bg-green-700/30 text-green-400' : 'bg-destructive/20 text-destructive'}`}
              >
                {e.active ? 'Activo' : 'Inactivo'}
              </button>
              <button onClick={() => { setEditing(e); setShowNew(true); }} className="bg-secondary w-8 h-8 rounded-full flex items-center justify-center">
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (e.role === 'admin') {
                    toast.error('No se puede eliminar el administrador principal');
                    return;
                  }
                  if (confirm(`¿Eliminar ${e.name}?`)) {
                    deleteEmployee(e.id);
                    toast.success('Empleado eliminado');
                  }
                }}
                className="bg-destructive/20 text-destructive w-8 h-8 rounded-full flex items-center justify-center"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showNew || editing) && (
        <EmployeeForm
          initial={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSave={(emp) => {
            saveEmployee(emp);
            toast.success(editing ? 'Empleado actualizado' : 'Empleado creado');
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EmployeeForm({ initial, onClose, onSave }: {
  initial: Employee | null;
  onClose: () => void;
  onSave: (e: Employee) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [username, setUsername] = useState(initial?.username || '');
  const [password, setPassword] = useState(initial?.password || '');
  const [role, setRole] = useState<Role>(initial?.role || 'personalizado');
  const [permissions, setPermissions] = useState<Permission>(
    initial?.permissions || {
      ver_pedidos: true, crear_combos: false, cambiar_estados: true,
      cambiar_precios: false, gestionar_productos: false, gestionar_empleados: false,
      gestionar_domicilio: false, ver_dashboard: false,
    }
  );

  const permLabels: { key: keyof Permission; label: string }[] = [
    { key: 'ver_pedidos', label: 'Ver pedidos' },
    { key: 'crear_combos', label: 'Crear combos' },
    { key: 'cambiar_estados', label: 'Cambiar estados' },
    { key: 'cambiar_precios', label: 'Cambiar precios' },
    { key: 'gestionar_productos', label: 'Gestionar productos' },
    { key: 'gestionar_empleados', label: 'Gestionar empleados' },
    { key: 'gestionar_domicilio', label: 'Modificar domicilio' },
    { key: 'ver_dashboard', label: 'Ver dashboard' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border max-h-[85vh] overflow-y-auto">
        <h3 className="font-cartoon text-base mb-3">{initial ? 'Editar empleado' : 'Nuevo empleado'}</h3>
        <div className="space-y-3">
          <FormRow label="Nombre completo">
            <input value={name} onChange={(e) => setName(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Teléfono">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Usuario">
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
            </FormRow>
            <FormRow label="Contraseña">
              <input value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
            </FormRow>
          </div>
          <FormRow label="Rol">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm">
              <option value="admin">Administrador</option>
              <option value="cocina">Cocina</option>
              <option value="repartidor">Repartidor</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </FormRow>

          {role === 'personalizado' && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-2">Permisos personalizados:</p>
              <div className="space-y-1.5">
                {permLabels.map((p) => (
                  <label key={p.key} className="flex items-center justify-between bg-background border border-border rounded-xl px-3 py-2">
                    <span className="text-sm">{p.label}</span>
                    <input
                      type="checkbox"
                      checked={permissions[p.key]}
                      onChange={(e) => setPermissions({ ...permissions, [p.key]: e.target.checked })}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-secondary py-2.5 rounded-xl font-bold text-sm">Cancelar</button>
            <button
              onClick={() => {
                if (!name.trim() || !username.trim() || !password.trim()) {
                  toast.error('Completa nombre, usuario y contraseña');
                  return;
                }
                onSave({
                  id: initial?.id || uid('emp'),
                  name: name.trim(),
                  phone: phone.trim(),
                  username: username.trim(),
                  password: password.trim(),
                  role,
                  active: initial?.active ?? true,
                  permissions,
                });
              }}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm"
            >
              <Save size={14} className="inline mr-1" /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== WhatsApp =====
function WhatsAppTab() {
  const whatsapp = useStore((s) => s.whatsapp);
  const saveWhatsApp = useStore((s) => s.saveWhatsApp);
  const toggleActive = useStore((s) => s.toggleWhatsAppActive);
  const deleteWhatsApp = useStore((s) => s.deleteWhatsApp);

  const [showNew, setShowNew] = useState(false);
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [func, setFunc] = useState<WhatsAppNumber['function']>('pedidos');

  return (
    <div className="space-y-3">
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 text-xs text-primary">
        💡 Los mensajes automáticos se envían a los números con función coincidente.
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
      >
        <Plus size={16} /> Nuevo número
      </button>

      {whatsapp.map((w) => (
        <div key={w.id} className="cartoon-border bg-card rounded-xl p-3 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-green-700/30 flex items-center justify-center text-xl">💬</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">{w.name}</p>
            <p className="text-[11px] text-muted-foreground">{w.number} · {w.function}</p>
          </div>
          <button
            onClick={() => toggleActive(w.id)}
            className={`text-[10px] font-bold px-2 py-1 rounded-full ${w.active ? 'bg-green-700/30 text-green-400' : 'bg-muted-foreground/20 text-muted-foreground'}`}
          >
            {w.active ? 'Activo' : 'Inactivo'}
          </button>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar ${w.name}?`)) {
                deleteWhatsApp(w.id);
                toast.success('Número eliminado');
              }
            }}
            className="bg-destructive/20 text-destructive w-8 h-8 rounded-full flex items-center justify-center"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border">
            <h3 className="font-cartoon text-base mb-3">Nuevo número WhatsApp</h3>
            <div className="space-y-3">
              <FormRow label="Nombre">
                <input value={name} onChange={(e) => setName(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
              </FormRow>
              <FormRow label="Número (con código país)">
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+53 5 1234567" className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
              </FormRow>
              <FormRow label="Función">
                <select value={func} onChange={(e) => setFunc(e.target.value as WhatsAppNumber['function'])} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm">
                  <option value="pedidos">Pedidos</option>
                  <option value="cocina">Cocina</option>
                  <option value="reparto">Reparto</option>
                  <option value="todos">Todos</option>
                </select>
              </FormRow>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNew(false)} className="flex-1 bg-secondary py-2.5 rounded-xl font-bold text-sm">Cancelar</button>
                <button
                  onClick={() => {
                    if (!number.trim() || !name.trim()) {
                      toast.error('Completa nombre y número');
                      return;
                    }
                    saveWhatsApp({
                      id: uid('wa'),
                      number: number.trim(),
                      name: name.trim(),
                      function: func,
                      active: true,
                    });
                    setName('');
                    setNumber('');
                    setShowNew(false);
                    toast.success('Número agregado');
                  }}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm"
                >
                  <Save size={14} className="inline mr-1" /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Configuración =====
function ConfigTab() {
  const config = useStore((s) => s.config);
  const updateConfig = useStore((s) => s.updateConfig);
  const [local, setLocal] = useState(config);

  const handleSave = () => {
    updateConfig(local);
    toast.success('Configuración guardada');
  };

  return (
    <div className="space-y-3">
      <div className="cartoon-border bg-card rounded-2xl p-4 space-y-3">
        <h3 className="font-cartoon text-sm">Datos del negocio</h3>
        <FormRow label="Nombre">
          <input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
        <FormRow label="Ciudad">
          <input value={local.city} onChange={(e) => setLocal({ ...local, city: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
        <FormRow label="Moneda">
          <input value={local.currency} onChange={(e) => setLocal({ ...local, currency: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
        <FormRow label="Dirección">
          <input value={local.address} onChange={(e) => setLocal({ ...local, address: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
        <FormRow label="Teléfono">
          <input value={local.phone} onChange={(e) => setLocal({ ...local, phone: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
      </div>

      <div className="cartoon-border bg-card rounded-2xl p-4 space-y-3">
        <h3 className="font-cartoon text-sm">Horarios</h3>
        <div className="grid grid-cols-2 gap-2">
          <FormRow label="Mañana inicio">
            <input value={local.morningStart} onChange={(e) => setLocal({ ...local, morningStart: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Mañana fin">
            <input value={local.morningEnd} onChange={(e) => setLocal({ ...local, morningEnd: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Entrega mañana">
            <input value={local.morningDelivery} onChange={(e) => setLocal({ ...local, morningDelivery: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Tarde inicio">
            <input value={local.afternoonStart} onChange={(e) => setLocal({ ...local, afternoonStart: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Tarde fin">
            <input value={local.afternoonEnd} onChange={(e) => setLocal({ ...local, afternoonEnd: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
          <FormRow label="Entrega tarde">
            <input value={local.afternoonDelivery} onChange={(e) => setLocal({ ...local, afternoonDelivery: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
          </FormRow>
        </div>
      </div>

      <div className="cartoon-border bg-card rounded-2xl p-4 space-y-3">
        <h3 className="font-cartoon text-sm">Domicilio y pago</h3>
        <FormRow label="Costo base domicilio (CUP)">
          <input type="number" value={local.deliveryBase} onChange={(e) => setLocal({ ...local, deliveryBase: parseInt(e.target.value) || 0 })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
        <FormRow label="Recargo transferencia (0.30 = 30%)">
          <input type="number" step="0.01" value={local.transferSurcharge} onChange={(e) => setLocal({ ...local, transferSurcharge: parseFloat(e.target.value) || 0 })} className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm" />
        </FormRow>
      </div>

      <button onClick={handleSave} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm">
        <Save size={16} className="inline mr-1" /> Guardar configuración
      </button>
    </div>
  );
}

// ===== Logs =====
function LogsTab() {
  const logs = useStore((s) => s.logs);

  return (
    <div className="space-y-1.5">
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin actividad registrada</p>
      ) : (
        logs.slice(0, 50).map((l) => (
          <div key={l.id} className="bg-card border border-border rounded-xl p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-primary">{l.action}</span>
              <span className="text-[10px] text-muted-foreground">{formatDateTime(l.date)}</span>
            </div>
            <p className="text-muted-foreground mt-0.5">
              {l.user && <strong>{l.user} · </strong>}
              {l.detail}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
