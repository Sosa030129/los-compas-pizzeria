'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, Lock, MapPin, Heart, Package, LogOut, Plus, Trash2,
  Loader2, ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  formatCUP, formatDateTime, getStateInfo, ingredientQtyMultiplier,
} from '@/lib/los-compas';
import { toast } from 'sonner';
import type { CartItem, PizzaSize } from '@/lib/types';

type Tab = 'login' | 'register' | 'profile';

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  addresses: { address: string; reference?: string }[];
  favorites: string[];
  orders: any[];
}

export function CustomerAccountView() {
  const setView = useStore((s) => s.setView);
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verificar sesión existente
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me');
      const result = await res.json();
      if (result.ok && result.session?.type === 'customer') {
        await loadProfile();
        setIsLoggedIn(true);
        setTab('profile');
      }
    } catch (e) {
      // Silencioso
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch('/api/customers/me');
      const result = await res.json();
      if (result.ok) {
        setProfile(result.customer);
      }
    } catch (e) {
      // Error silencioso
    }
  }

  // ===== LOGIN =====
  async function handleLogin(phone: string, password: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('Sesión iniciada');
        await loadProfile();
        setIsLoggedIn(true);
        setTab('profile');
      } else {
        toast.error(result.error || 'Credenciales inválidas');
      }
    } catch (e) {
      toast.error('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  // ===== REGISTRO =====
  async function handleRegister(name: string, phone: string, email: string, password: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password }),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('Cuenta creada');
        await loadProfile();
        setIsLoggedIn(true);
        setTab('profile');
      } else {
        toast.error(result.error || 'Error al registrar');
      }
    } catch (e) {
      toast.error('Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  // ===== LOGOUT =====
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setIsLoggedIn(false);
    setProfile(null);
    setTab('login');
    toast.success('Sesión cerrada');
    setView('home');
  }

  // ===== AGREGAR DIRECCIÓN =====
  async function handleAddAddress(address: string, reference: string) {
    try {
      const res = await fetch('/api/customers/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, reference }),
      });
      const result = await res.json();
      if (result.ok) {
        await loadProfile();
        toast.success('Dirección agregada');
      } else {
        toast.error(result.error || 'Error');
      }
    } catch (e) {
      toast.error('Error');
    }
  }

  // ===== ELIMINAR DIRECCIÓN =====
  async function handleDeleteAddress(index: number) {
    try {
      const res = await fetch(`/api/customers/addresses?index=${index}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.ok) {
        await loadProfile();
        toast.success('Dirección eliminada');
      }
    } catch (e) {
      toast.error('Error');
    }
  }

  // ===== RENDER =====
  if (isLoggedIn && profile) {
    return <ProfileView profile={profile} onLogout={handleLogout} onAddAddress={handleAddAddress} onDeleteAddress={handleDeleteAddress} onRefresh={loadProfile} setView={setView} />;
  }

  return (
    <div className="animate-screen-enter pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-cartoon text-base">Mi Cuenta</h1>
          <p className="text-[11px] text-muted-foreground">
            Crea una cuenta opcional para guardar tus direcciones, favoritos e historial de pedidos
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Tabs login/register */}
        <div className="flex gap-2 mb-4 bg-secondary rounded-full p-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition ${tab === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition ${tab === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Crear cuenta
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <LoginForm onSubmit={handleLogin} loading={loading} />
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <RegisterForm onSubmit={handleRegister} loading={loading} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 bg-secondary/30 border border-border rounded-2xl p-3 text-[11px] text-muted-foreground">
          💡 <strong>Cuenta opcional.</strong> Puedes pedir sin cuenta (solo ingresa tus datos en el checkout).
          Con cuenta, guardamos tus direcciones favoritas, historial y podrás repetir pedidos fácilmente.
        </div>
      </div>
    </div>
  );
}

// ===== LOGIN FORM =====
function LoginForm({ onSubmit, loading }: { onSubmit: (phone: string, password: string) => void; loading: boolean }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="cartoon-border bg-card rounded-2xl p-5 space-y-3">
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground mb-1">Teléfono</label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+53 5 1234567"
            className="bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground mb-1">Contraseña</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => { if (e.key === 'Enter' && phone.trim() && password) onSubmit(phone, password); }}
            className="bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <button
        onClick={() => onSubmit(phone, password)}
        disabled={loading || !phone.trim() || !password}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : 'Iniciar sesión'}
      </button>
    </div>
  );
}

// ===== REGISTER FORM =====
function RegisterForm({ onSubmit, loading }: { onSubmit: (name: string, phone: string, email: string, password: string) => void; loading: boolean }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="cartoon-border bg-card rounded-2xl p-5 space-y-3">
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground mb-1">Nombre completo *</label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Carlos Pérez"
            className="bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground mb-1">Teléfono *</label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+53 5 1234567"
            className="bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground mb-1">Email (opcional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="carlos@example.com"
          className="bg-background border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground mb-1">Contraseña *</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 4 caracteres"
            className="bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <button
        onClick={() => {
          // Bug #31: Validación client-side antes de enviar
          if (password.length < 4) {
            toast.error('La contraseña debe tener al menos 4 caracteres');
            return;
          }
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Email inválido');
            return;
          }
          onSubmit(name, phone, email, password);
        }}
        disabled={loading || !name.trim() || !phone.trim() || password.length < 4}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : 'Crear cuenta'}
      </button>
    </div>
  );
}

// ===== PROFILE VIEW =====
function ProfileView({
  profile, onLogout, onAddAddress, onDeleteAddress, onRefresh, setView,
}: {
  profile: CustomerProfile;
  onLogout: () => void;
  onAddAddress: (address: string, reference: string) => void;
  onDeleteAddress: (index: number) => void;
  onRefresh: () => void;
  setView: (v: any) => void;
}) {
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newRef, setNewRef] = useState('');

  // FASE 3.3: Pedir de nuevo — reconstruir pedido con precios actuales (no históricos)
  const addToCart = useStore((s) => s.addToCart);
  const products = useStore((s) => s.products);
  const sizes = useStore((s) => s.sizes);
  const ingredients = useStore((s) => s.ingredients);

  const repeatOrder = (order: any) => {
    if (!order.items || !Array.isArray(order.items)) return;
    let added = 0;
    for (const item of order.items) {
      // Si el item tenía productId, buscar el producto actual
      let unitPrice = item.unitPrice ?? 0;
      let extrasTotal = item.extrasTotal ?? 0;
      let name = item.name;
      let emoji = item.emoji;
      let isCombo = item.isCombo;

      if (item.productId) {
        const p = products.find((pr) => pr.id === item.productId);
        if (p) {
          if (!p.available) {
            toast.error(`${p.name} no está disponible`);
            continue;
          }
          name = p.name;
          emoji = p.emoji;
          isCombo = p.isCombo;
          if (p.isPizza) {
            // Pizza: recalcular precio por tamaño actual + borde + ingredientes
            const sz = sizes.find((s) => s.id === item.size);
            if (sz) {
              unitPrice = sz.basePrice + (item.borderCheese ? (sz.borderDelta ?? 0) : 0);
            }
            // Recalcular extras con precios actuales de ingredientes
            const defaultIds = new Set(p.defaultIngredients || []);
            extrasTotal = (item.ingredients || []).reduce((sum: number, ci: any) => {
              const ing = ingredients.find((i) => i.id === ci.ingredientId);
              if (!ing || !item.size) return sum;
              const price = ing.priceBySize[item.size as PizzaSize] || 0;
              const mult = ingredientQtyMultiplier(ci.qty);
              const freePortions = defaultIds.has(ci.ingredientId) ? 1 : 0;
              return sum + price * Math.max(0, mult - freePortions);
            }, 0);
          } else {
            // Producto normal: usar precio actual
            unitPrice = p.price;
            extrasTotal = 0;
          }
        }
      }

      const cartItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        productId: item.productId,
        name,
        emoji,
        unitPrice,
        qty: Math.max(1, Math.floor(item.qty ?? 1)),
        size: item.size,
        borderCheese: item.borderCheese,
        extrasTotal,
        ingredients: item.ingredients,
        isCombo,
        notes: item.notes,
      };
      addToCart(cartItem);
      added++;
    }
    if (added > 0) {
      toast.success(`${added} producto(s) agregado(s) al carrito`);
      setView('cart');
    }
  };

  return (
    <div className="animate-screen-enter pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-cartoon text-base leading-tight truncate">{profile.name}</h1>
            <p className="text-[11px] text-muted-foreground">{profile.phone}</p>
          </div>
          <button
            onClick={onLogout}
            className="bg-secondary w-9 h-9 rounded-full flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="cartoon-border bg-card rounded-2xl p-3 text-center">
            <div className="text-2xl mb-1">📍</div>
            <div className="font-cartoon text-base text-primary">{profile.addresses.length}</div>
            <div className="text-[10px] text-muted-foreground">Direcciones guardadas</div>
          </div>
          <div className="cartoon-border bg-card rounded-2xl p-3 text-center">
            <div className="text-2xl mb-1">📦</div>
            <div className="font-cartoon text-base text-primary">{profile.orders.length}</div>
            <div className="text-[10px] text-muted-foreground">Pedidos realizados</div>
          </div>
        </div>

        {/* Direcciones */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-cartoon text-sm flex items-center gap-1.5">
              <MapPin size={16} className="text-primary" /> Mis direcciones
            </h2>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="text-xs text-primary font-bold hover:underline"
            >
              {showAddAddress ? 'Cancelar' : '+ Agregar'}
            </button>
          </div>

          {showAddAddress && (
            <div className="cartoon-border bg-card rounded-2xl p-3 mb-2 space-y-2">
              <input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Calle, número, entre calles"
                className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm"
              />
              <input
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
                placeholder="Referencia (opcional)"
                className="bg-background border border-border rounded-xl px-3 py-2 w-full text-sm"
              />
              <button
                onClick={() => {
                  if (!newAddress.trim()) {
                    toast.error('Dirección obligatoria');
                    return;
                  }
                  onAddAddress(newAddress, newRef);
                  setNewAddress('');
                  setNewRef('');
                  setShowAddAddress(false);
                }}
                className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-bold"
              >
                Guardar dirección
              </button>
            </div>
          )}

          {profile.addresses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No tienes direcciones guardadas todavía
            </p>
          ) : (
            <div className="space-y-1.5">
              {profile.addresses.map((addr, i) => (
                <div key={i} className="cartoon-border bg-card rounded-xl p-3 flex items-start gap-2">
                  <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{addr.address}</p>
                    {addr.reference && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{addr.reference}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteAddress(i)}
                    className="text-destructive hover:bg-destructive/10 w-7 h-7 rounded-full flex items-center justify-center"
                    aria-label="Eliminar dirección"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FASE 3.4: Favoritos locales */}
        <FavoriteSection setView={setView} />

        {/* Historial de pedidos */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-cartoon text-sm flex items-center gap-1.5">
              <Package size={16} className="text-primary" /> Historial de pedidos
            </h2>
            <button onClick={onRefresh} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              <RefreshCw size={11} /> Refrescar
            </button>
          </div>

          {profile.orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-xs mb-3">No tienes pedidos todavía</p>
              <button
                onClick={() => setView('menu')}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-xs"
              >
                Hacer mi primer pedido
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.orders.map((o: any) => {
                const st = getStateInfo(o.state);
                return (
                  <div
                    key={o.id}
                    className="cartoon-border bg-card rounded-2xl p-3 w-full text-left hover:bg-accent/20 transition"
                  >
                    <button
                      onClick={() => {
                        // Usar el store para mostrar el detalle
                        useStore.getState().setSelectedOrder(o.id);
                        setView('tracking');
                      }}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <span className="font-bold text-xs text-primary w-16">{o.code}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">
                          {o.items?.length || 0} producto(s) · {formatCUP(o.total)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateTime(typeof o.createdAt === 'number' ? o.createdAt : new Date(o.createdAt).getTime())}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${st.color}33`, color: st.color }}>
                        {st.emoji} {st.label}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                    {/* FASE 3.3: Botón Repetir pedido */}
                    <button
                      onClick={() => repeatOrder(o)}
                      className="mt-2 w-full bg-secondary hover:bg-secondary/70 text-foreground py-1.5 rounded-full font-bold text-[11px] flex items-center justify-center gap-1"
                    >
                      <RefreshCw size={11} /> Repetir pedido
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// FASE 3.4: Componente separado para favoritos (suscribe al store directamente)
function FavoriteSection({ setView }: { setView: (v: any) => void }) {
  const favorites = useStore((s) => s.favorites);
  const products = useStore((s) => s.products);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const addToCart = useStore((s) => s.addToCart);

  const favProducts = products.filter((p) => favorites.includes(p.id));

  return (
    <section>
      <h2 className="font-cartoon text-sm flex items-center gap-1.5 mb-2">
        <Heart size={16} className="text-primary" /> Mis favoritos ({favProducts.length})
      </h2>
      {favProducts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Marca productos con el corazón ❤️ en el menú para verlos aquí.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {favProducts.map((p) => (
            <div key={p.id} className="cartoon-border bg-card rounded-xl p-2.5 flex flex-col">
              <div className="flex items-start justify-between gap-1">
                <span className="text-3xl">{p.emoji}</span>
                <button
                  onClick={() => toggleFavorite(p.id)}
                  className="text-primary hover:bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center"
                  aria-label="Quitar de favoritos"
                >
                  <Heart size={11} fill="currentColor" />
                </button>
              </div>
              <h3 className="font-cartoon text-xs leading-tight mt-1">{p.name}</h3>
              <p className="text-[11px] font-bold text-primary mt-0.5">
                {p.isPizza ? 'Desde ' : ''}{(p.isPizza ? Math.min(...useStore.getState().sizes.map((s) => s.basePrice)) : p.price).toLocaleString('es-CU')} CUP
              </p>
              {p.available && (
                <button
                  onClick={() => {
                    // FASE 3.4: agregar rápido al carrito (para productos no-pizza)
                    if (p.isPizza) {
                      // Para pizza, ir al menú y abrir el modal
                      setView('menu');
                    } else {
                      addToCart({
                        id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        productId: p.id,
                        name: p.name,
                        emoji: p.emoji,
                        unitPrice: p.price,
                        qty: 1,
                        extrasTotal: 0,
                      });
                      toast.success(`${p.name} agregado al carrito`);
                    }
                  }}
                  className="mt-1.5 bg-primary text-primary-foreground text-[10px] font-bold py-1 rounded-full"
                >
                  + Agregar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
