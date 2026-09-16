'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// Re-export useShallow for convenience
export { useShallow };

import type {
  AppState,
  BusinessConfig,
  CartItem,
  Category,
  Employee,
  Ingredient,
  Order,
  OrderState,
  PaymentMethod,
  Product,
  Promotion,
  TimeSlot,
  View,
  WhatsAppNumber,
  ActivityLog,
  PizzaSize,
} from './types';
import {
  CATEGORIES, COMBOS, CONFIG, EMPLOYEES, INGREDIENTS, PRODUCTS, PROMOTIONS, SIZES, WHATSAPP,
} from './seed';
import { uid, shortCode } from './los-compas';
import {
  canAccessView, checkLoginRateLimit, registerFailedLogin, resetLoginAttempts,
  verifyPassword, hashPassword, isHashedPassword,
} from './auth';

interface StoreActions {
  // UI
  setView: (v: View) => void;
  setSelectedOrder: (id: string | null) => void;

  // Carrito
  addToCart: (item: CartItem) => void;
  updateCartItem: (id: string, patch: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;

  // Promociones (código cliente)
  setAppliedPromoCode: (code: string | null) => void;

  // Pedidos
  placeOrder: (data: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    reference?: string;
    paymentMethod: PaymentMethod;
    timeSlot: TimeSlot;
    deliveryMode: 'domicilio' | 'recogida';
    scheduledTime: string;
    notes?: string;
    discount?: number;
    surcharge?: number;
  }) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  setOrderState: (id: string, state: OrderState) => void;
  setOrderDelivery: (id: string, delivery: number) => void;
  assignDelivery: (orderId: string, employeeId: string) => void;

  // Productos
  saveProduct: (p: Product) => void;
  toggleProductAvailable: (id: string) => void;
  deleteProduct: (id: string) => void;

  // Ingredientes
  saveIngredient: (i: Ingredient) => void;
  toggleIngredientAvailable: (id: string) => void;
  deleteIngredient: (id: string) => void;

  // Categorías
  saveCategory: (c: Category) => void;
  toggleCategoryVisible: (id: string) => void;
  deleteCategory: (id: string) => void;

  // Tamaños de pizza
  saveSize: (id: string, basePrice: number) => void;

  // Promociones (admin)
  savePromotion: (p: Promotion) => void;
  togglePromotionActive: (id: string) => void;
  deletePromotion: (id: string) => void;

  // Empleados
  saveEmployee: (e: Employee) => void;
  toggleEmployeeActive: (id: string) => void;
  deleteEmployee: (id: string) => void;
  loginEmployee: (username: string, password: string) => Promise<{ ok: boolean; error: string | null }>;
  logoutEmployee: () => void;

  // WhatsApp
  saveWhatsApp: (w: WhatsAppNumber) => void;
  toggleWhatsAppActive: (id: string) => void;
  deleteWhatsApp: (id: string) => void;

  // Configuración
  updateConfig: (patch: Partial<BusinessConfig>) => void;

  // Logs
  addLog: (user: string, action: string, detail: string) => void;

  // Backup / Restore
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
}

type Store = AppState & StoreActions;

const initialState: AppState = {
  categories: CATEGORIES,
  products: PRODUCTS,
  ingredients: INGREDIENTS,
  sizes: SIZES,
  combos: COMBOS,
  promotions: PROMOTIONS,
  appliedPromoCode: null,
  cart: [],
  orders: [],
  lastCustomerPhone: null,
  employees: EMPLOYEES,
  currentEmployee: null,
  whatsapp: WHATSAPP,
  config: CONFIG,
  logs: [],
  currentView: 'home',
  selectedOrderId: null,
};

// ===== Helpers libres de efectos (computan sobre el estado, no lo mutan) =====
function computeCartCount(state: AppState): number {
  return state.cart.reduce((n, c) => n + c.qty, 0);
}

function computeCartTotals(state: AppState): { subtotal: number; extras: number; delivery: number | null; total: number } {
  let subtotal = 0;
  let extras = 0;
  for (const item of state.cart) {
    subtotal += item.unitPrice * item.qty;
    extras += item.extrasTotal * item.qty;
  }
  const delivery =
    state.cart.length > 0 && state.cart.some((i) => !i.isCombo)
      ? null
      : 0;
  const base = subtotal + extras;
  const total = delivery === null ? base : base + delivery;
  return { subtotal, extras, delivery, total };
}

// Cap de logs para evitar localStorage overflow (max 200)
const MAX_LOGS = 200;
function capLogs<T extends ActivityLog>(logs: T[]): T[] {
  return logs.slice(0, MAX_LOGS);
}

export const useStore = create<Store>()(
  (set, get) => ({
    ...initialState,

    // ===== UI =====
    setView: (v) => set({ currentView: v }),
    setSelectedOrder: (id) => set({ selectedOrderId: id }),

      // ===== Carrito =====
      addToCart: (item) =>
        set((s) => {
          const existing = s.cart.find((c) => isSameItem(c, item));
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.id === existing.id ? { ...c, qty: c.qty + item.qty } : c
              ),
            };
          }
          return { cart: [...s.cart, item] };
        }),

      updateCartItem: (id, patch) =>
        set((s) => ({
          cart: s.cart.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

      clearCart: () => set({ cart: [], appliedPromoCode: null }),

      // ===== Pedidos =====
      placeOrder: (async (data: {
        customerName: string;
        customerPhone: string;
        customerAddress: string;
        reference?: string;
        paymentMethod: PaymentMethod;
        timeSlot: TimeSlot;
        deliveryMode: 'domicilio' | 'recogida';
        scheduledTime: string;
        notes?: string;
        discount?: number;
        surcharge?: number;
      }) => {
        // Construir items del carrito para enviar al servidor
        const cart = get().cart;
        let subtotal = 0;
        let extras = 0;
        for (const item of cart) {
          subtotal += item.unitPrice * item.qty;
          extras += item.extrasTotal * item.qty;
        }
        const discount = data.discount || 0;
        const surcharge = data.surcharge || 0;
        const base = subtotal + extras;
        const total = Math.max(0, base - discount + surcharge);

        // ===== LLAMAR A LA API (POST /api/orders) =====
        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              customerAddress: data.customerAddress,
              reference: data.reference,
              items: cart,
              subtotal,
              extras,
              discount,
              surcharge,
              total,
              paymentMethod: data.paymentMethod,
              timeSlot: data.timeSlot,
              deliveryMode: data.deliveryMode,
              scheduledTime: data.scheduledTime,
              notes: data.notes,
              delivery: data.deliveryMode === 'domicilio' ? null : 0,
            }),
          });
          const result = await res.json();
          if (!result.ok) {
            // Bug #7: NO enmascarar errores del servidor con fallback offline
            throw new Error(result.error || 'Error creando pedido');
          }
          const order = result.order as Order;
          // Parsear items si vienen como string JSON desde el server
          if (typeof order.items === 'string') {
            order.items = JSON.parse(order.items);
          }
          // Convertir fechas ISO a timestamps
          order.createdAt = typeof order.createdAt === 'string' ? new Date(order.createdAt).getTime() : order.createdAt;
          set((s) => ({
            orders: [order, ...s.orders],
            cart: [],
            appliedPromoCode: null,
            lastCustomerPhone: data.customerPhone,
            currentView: 'tracking',
            selectedOrderId: order.id,
            logs: capLogs([
              {
                id: uid('log'),
                user: data.customerName,
                action: 'Nuevo pedido',
                detail: `Código ${order.code} - Total ${order.total}`,
                date: Date.now(),
              },
              ...s.logs,
            ]),
          }));
          return order;
        } catch (e: any) {
          // Bug #7: Solo fallback offline en error de RED real (no en respuesta HTTP con error)
          if (e instanceof TypeError && e.message.includes('fetch')) {
            // Error de red real: fallback offline
            const order: Order = {
              id: uid('order'),
              code: shortCode(),
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              customerAddress: data.customerAddress,
              reference: data.reference,
              items: cart,
              subtotal,
              extras,
              delivery: data.deliveryMode === 'domicilio' ? null : 0,
              discount,
              surcharge,
              total,
              paymentMethod: data.paymentMethod,
              timeSlot: data.timeSlot,
              deliveryMode: data.deliveryMode,
              scheduledTime: data.scheduledTime,
              state: 'recibido',
              createdAt: Date.now(),
              notes: data.notes,
            };
            set((s) => ({
              orders: [order, ...s.orders],
              cart: [],
              appliedPromoCode: null,
              lastCustomerPhone: data.customerPhone,
              currentView: 'tracking',
              selectedOrderId: order.id,
              logs: capLogs([
                {
                  id: uid('log'),
                  user: data.customerName,
                  action: 'Nuevo pedido (offline)',
                  detail: `Código ${order.code} - Total ${order.total}`,
                  date: Date.now(),
                },
                ...s.logs,
              ]),
            }));
            return order;
          }
          // Error del servidor (no de red): propagar al caller
          throw e;
        }
      }) as any,

      updateOrder: (id, patch) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),

      setOrderState: (async (id: string, state: OrderState) => {
        const user = get().currentEmployee?.name || 'Sistema';
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;

        // Guardar estado anterior para rollback (bug #8, #35)
        const prevState = order.state;

        // ===== LLAMAR A LA API Y VERIFICAR RESPUESTA =====
        try {
          const res = await fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state }),
          });
          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            toast.error(result.error || 'Error al cambiar estado');
            return; // No actualizar localmente si el server rechaza
          }
        } catch (e) {
          toast.error('Error de conexión al cambiar estado');
          return; // No actualizar localmente si hay error de red
        }

        // Server confirmó: actualizar localmente
        const patch: Partial<Order> = { state };
        if (state === 'confirmado') patch.confirmedAt = Date.now();
        if (state === 'entregado') patch.deliveredAt = Date.now();

        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
          logs: capLogs([
            {
              id: uid('log'),
              user,
              action: 'Cambio de estado',
              detail: `Pedido ${order.code}: ${prevState} → ${state}`,
              date: Date.now(),
            },
            ...s.logs,
          ]),
        }));
      }) as any,

      setOrderDelivery: (async (id: string, delivery: number) => {
        const user = get().currentEmployee?.name || 'Sistema';
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        const safeDelivery = Math.max(0, Number.isFinite(delivery) ? delivery : 0);
        const newTotal = Math.max(0, order.subtotal + order.extras - order.discount + safeDelivery + order.surcharge);

        // ===== LLAMAR A LA API Y VERIFICAR RESPUESTA =====
        try {
          const res = await fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery: safeDelivery }),
          });
          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            toast.error(result.error || 'Error al cambiar domicilio');
            return;
          }
        } catch (e) {
          toast.error('Error de conexión al cambiar domicilio');
          return;
        }

        // Server confirmó: actualizar localmente
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, delivery: safeDelivery, total: newTotal } : o
          ),
          logs: capLogs([
            {
              id: uid('log'),
              user,
              action: 'Cambio de domicilio',
              detail: `Pedido ${order.code}: domicilio = ${safeDelivery} CUP`,
              date: Date.now(),
            },
            ...s.logs,
          ]),
        }));
      }) as any,

      assignDelivery: (async (orderId: string, employeeId: string) => {
        // Validar que el pedido esté en estado 'listo' antes de asignar
        const order = get().orders.find((o) => o.id === orderId);
        if (!order || order.state !== 'listo') {
          toast.error('Solo se puede asignar repartidor a pedidos listos');
          return;
        }

        // ===== LLAMAR A LA API (PATCH /api/orders/[id]) =====
        try {
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedDeliveryId: employeeId }),
          });
          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            toast.error(result.error || 'Error al asignar repartidor');
            return;
          }
          toast.success('Repartidor asignado');
        } catch (e) {
          toast.error('Error de conexión al asignar repartidor');
          return;
        }

        // Actualizar localmente solo si el server confirmó
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, assignedDelivery: employeeId, state: 'camino' } : o
          ),
        }));
      }) as any,

      // ===== Productos =====
      saveProduct: (p) =>
        set((s) => {
          const exists = s.products.find((x) => x.id === p.id);
          if (exists) {
            return { products: s.products.map((x) => (x.id === p.id ? p : x)) };
          }
          return { products: [...s.products, p] };
        }),

      toggleProductAvailable: (id) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, available: !p.available } : p
          ),
        })),

      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      // ===== Ingredientes =====
      saveIngredient: (i) =>
        set((s) => {
          const exists = s.ingredients.find((x) => x.id === i.id);
          if (exists) {
            return {
              ingredients: s.ingredients.map((x) => (x.id === i.id ? i : x)),
            };
          }
          return { ingredients: [...s.ingredients, i] };
        }),

      toggleIngredientAvailable: (id) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) =>
            i.id === id ? { ...i, available: !i.available } : i
          ),
        })),

      deleteIngredient: (id) =>
        set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) })),

      // ===== Categorías =====
      saveCategory: (c) =>
        set((s) => {
          const exists = s.categories.find((x) => x.id === c.id);
          if (exists) {
            return { categories: s.categories.map((x) => (x.id === c.id ? c : x)) };
          }
          return { categories: [...s.categories, c] };
        }),

      toggleCategoryVisible: (id) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, visible: !c.visible } : c
          ),
        })),

      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      // ===== Tamaños de pizza =====
      saveSize: (id, basePrice) =>
        set((s) => ({
          sizes: s.sizes.map((sz) =>
            sz.id === id ? { ...sz, basePrice: Math.max(0, Math.floor(basePrice)) } : sz
          ),
        })),

      // ===== Promociones =====
      setAppliedPromoCode: (code) => set({ appliedPromoCode: code }),

      savePromotion: (p) =>
        set((s) => {
          const exists = s.promotions.find((x) => x.id === p.id);
          if (exists) {
            return { promotions: s.promotions.map((x) => (x.id === p.id ? p : x)) };
          }
          return { promotions: [...s.promotions, p] };
        }),

      togglePromotionActive: (id) =>
        set((s) => ({
          promotions: s.promotions.map((p) =>
            p.id === id ? { ...p, active: !p.active } : p
          ),
        })),

      deletePromotion: (id) =>
        set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) })),

      // ===== Empleados =====
      saveEmployee: (e) =>
        set((s) => {
          const exists = s.employees.find((x) => x.id === e.id);
          // Prevenir degradar al admin principal (rol admin → otro rol)
          if (exists?.role === 'admin' && e.role !== 'admin') {
            return s;
          }
          // Prevenir username duplicado (case-insensitive)
          const duplicate = s.employees.find(
            (x) => x.id !== e.id && x.username.toLowerCase() === e.username.toLowerCase()
          );
          if (duplicate) return s;

          if (exists) {
            const newEmployees = s.employees.map((x) => (x.id === e.id ? e : x));
            // Sync currentEmployee si se editó a sí mismo (evita stale)
            const newCurrent = s.currentEmployee?.id === e.id ? { ...e } : s.currentEmployee;
            return { employees: newEmployees, currentEmployee: newCurrent };
          }
          return { employees: [...s.employees, e] };
        }),

      toggleEmployeeActive: (id) =>
        set((s) => {
          // Prevenir que el admin se desactive a sí mismo (lockout)
          if (id === s.currentEmployee?.id) return s;
          return {
            employees: s.employees.map((e) =>
              e.id === id ? { ...e, active: !e.active } : e
            ),
          };
        }),

      deleteEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),

      loginEmployee: (async (username: string, password: string) => {
        // Rate limit local
        const rl = checkLoginRateLimit(username);
        if (!rl.allowed) {
          return { ok: false, error: `Demasiados intentos. Espera ${Math.ceil(rl.remainingMs / 1000)}s.` };
        }

        // ===== LLAMAR A LA API (POST /api/auth/employee/login) =====
        try {
          const res = await fetch('/api/auth/employee/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          const result = await res.json();
          if (!result.ok) {
            registerFailedLogin(username);
            return { ok: false, error: result.error || 'Credenciales inválidas' };
          }
          // Login exitoso: el servidor ya seteó la cookie httpOnly
          resetLoginAttempts(username);
          const emp = result.employee as Employee;
          set((s) => ({
            currentEmployee: emp,
            logs: capLogs([
              {
                id: uid('log'),
                user: emp.name,
                action: 'Inicio de sesión',
                detail: `Rol: ${emp.role}`,
                date: Date.now(),
              },
              ...s.logs,
            ]),
          }));
          return { ok: true, error: null };
        } catch (e) {
          // Fallback: intentar login local (modo demo offline)
          const emp = get().employees.find(
            (e) => e.username.toLowerCase() === username.toLowerCase() && e.active
          );
          if (!emp) {
            registerFailedLogin(username);
            return { ok: false, error: 'Usuario o contraseña incorrectos' };
          }
          const passwordOk = await verifyPassword(password, emp.password);
          if (!passwordOk) {
            registerFailedLogin(username);
            return { ok: false, error: 'Usuario o contraseña incorrectos' };
          }
          resetLoginAttempts(username);
          set((s) => ({
            currentEmployee: { ...emp },
            logs: capLogs([
              {
                id: uid('log'),
                user: emp.name,
                action: 'Inicio de sesión (offline)',
                detail: `Rol: ${emp.role}`,
                date: Date.now(),
              },
              ...s.logs,
            ]),
          }));
          return { ok: true, error: null };
        }
      }) as any,

      logoutEmployee: () => {
        const emp = get().currentEmployee;
        if (emp) {
          // ===== LLAMAR A LA API (POST /api/auth/logout) =====
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
          set((s) => ({
            currentEmployee: null,
            currentView: 'home',
            logs: capLogs([
              {
                id: uid('log'),
                user: emp.name,
                action: 'Cierre de sesión',
                detail: '',
                date: Date.now(),
              },
              ...s.logs,
            ]),
          }));
        } else {
          set({ currentEmployee: null, currentView: 'home' });
        }
      },

      // ===== WhatsApp =====
      saveWhatsApp: (w) =>
        set((s) => {
          const exists = s.whatsapp.find((x) => x.id === w.id);
          if (exists) {
            return { whatsapp: s.whatsapp.map((x) => (x.id === w.id ? w : x)) };
          }
          return { whatsapp: [...s.whatsapp, w] };
        }),

      toggleWhatsAppActive: (id) =>
        set((s) => ({
          whatsapp: s.whatsapp.map((w) =>
            w.id === id ? { ...w, active: !w.active } : w
          ),
        })),

      deleteWhatsApp: (id) =>
        set((s) => ({ whatsapp: s.whatsapp.filter((w) => w.id !== id) })),

      // ===== Configuración =====
      updateConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),

      // ===== Logs =====
      addLog: (user, action, detail) =>
        set((s) => ({
          logs: capLogs([
            { id: uid('log'), user, action, detail, date: Date.now() },
            ...s.logs,
          ]),
        })),

      // ===== Backup / Restore =====
      exportData: () => {
        const s = get();
        const data = {
          version: 2,
          exportedAt: new Date().toISOString(),
          business: s.config.name,
          categories: s.categories,
          products: s.products,
          ingredients: s.ingredients,
          sizes: s.sizes,
          combos: s.combos,
          promotions: s.promotions,
          orders: s.orders,
          employees: s.employees,
          whatsapp: s.whatsapp,
          config: s.config,
          logs: s.logs,
        };
        return JSON.stringify(data, null, 2);
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== 'object') return false;
          // Mergear con cuidado: solo sobreescribir si el dato es válido
          const patch: Partial<AppState> = {};
          if (Array.isArray(data.categories)) patch.categories = data.categories;
          if (Array.isArray(data.products)) patch.products = data.products;
          if (Array.isArray(data.ingredients)) patch.ingredients = data.ingredients;
          if (Array.isArray(data.sizes)) patch.sizes = data.sizes;
          if (Array.isArray(data.combos)) patch.combos = data.combos;
          if (Array.isArray(data.promotions)) patch.promotions = data.promotions;
          if (Array.isArray(data.orders)) patch.orders = data.orders;
          if (Array.isArray(data.employees)) patch.employees = data.employees;
          if (Array.isArray(data.whatsapp)) patch.whatsapp = data.whatsapp;
          if (data.config && typeof data.config === 'object') patch.config = data.config;
          if (Array.isArray(data.logs)) patch.logs = data.logs;
          set({ ...patch });
          return true;
        } catch (e) {
          return false;
        }
      },

      // ===== Reset =====
      resetAll: () => {
        set({ ...initialState, currentView: 'home' });
      },
    })
);

// ===== Persistencia manual del carrito (sin middleware persist para evitar SSR mismatch) =====
// Cargar carrito desde localStorage al montar
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('los-compas-cart');
    if (saved) {
      const { cart, appliedPromoCode, lastCustomerPhone } = JSON.parse(saved);
      useStore.setState({
        cart: Array.isArray(cart) ? cart : [],
        appliedPromoCode: appliedPromoCode || null,
        lastCustomerPhone: lastCustomerPhone || null,
      });
    }
  } catch {}

  // Guardar carrito en localStorage cuando cambia
  useStore.subscribe((state) => {
    try {
      localStorage.setItem('los-compas-cart', JSON.stringify({
        cart: state.cart,
        appliedPromoCode: state.appliedPromoCode,
        lastCustomerPhone: state.lastCustomerPhone,
      }));
    } catch {}
  });
}

// ===== Selectores recomendados para componentes =====
// Para selectores que devuelven objetos, envolver con useShallow:
//   const { subtotal, total } = useStore(useShallow(s => cartTotals(s)))
export const selectCartCount = (s: AppState & StoreActions): number =>
  computeCartCount(s);
export const selectCartTotals = (s: AppState & StoreActions) =>
  computeCartTotals(s);

function isSameItem(a: CartItem, b: CartItem): boolean {
  if (a.productId !== b.productId) return false;
  if (a.size !== b.size) return false;
  if (a.borderCheese !== b.borderCheese) return false;
  if (a.isCombo !== b.isCombo) return false;
  const aIng = JSON.stringify(a.ingredients || []);
  const bIng = JSON.stringify(b.ingredients || []);
  if (aIng !== bIng) return false;
  if (a.notes !== b.notes) return false;
  return true;
}

export function defaultSize(): PizzaSize {
  return 'familiar_42x30';
}

// ===== Funciones de hidratación desde el backend =====
// Carga el catálogo (productos, categorías, ingredientes, tamaños, promociones, config, whatsapp)
// desde /api/catalog y actualiza el store. Útil al montar la app.
export async function hydrateFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) return false;
    const result = await res.json();
    if (!result.ok || !result.catalog) return false;

    const c = result.catalog;
    const patch: any = {};
    if (Array.isArray(c.categories)) patch.categories = c.categories;
    if (Array.isArray(c.products)) patch.products = c.products;
    if (Array.isArray(c.ingredients)) patch.ingredients = c.ingredients;
    if (Array.isArray(c.sizes)) patch.sizes = c.sizes;
    if (Array.isArray(c.promotions)) patch.promotions = c.promotions;
    if (Array.isArray(c.whatsappNumbers)) patch.whatsapp = c.whatsappNumbers;
    if (c.config) patch.config = c.config;

    if (Array.isArray(c.products)) {
      patch.combos = c.products.filter((p: any) => p.isCombo);
    }

    useStore.setState(patch);
    return true;
  } catch (e) {
    return false;
  }
}

// Refresca la lista de pedidos desde el servidor
// (empleados ven todos, clientes ven solo los suyos - el servidor decide según la sesión)
export async function refreshOrders(): Promise<boolean> {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) return false;
    const result = await res.json();
    if (!result.ok || !Array.isArray(result.orders)) return false;
    // Parsear items JSON string en cada pedido
    const orders = result.orders.map((o: any) => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      createdAt: typeof o.createdAt === 'string' ? new Date(o.createdAt).getTime() : o.createdAt,
      confirmedAt: o.confirmedAt ? (typeof o.confirmedAt === 'string' ? new Date(o.confirmedAt).getTime() : o.confirmedAt) : undefined,
      deliveredAt: o.deliveredAt ? (typeof o.deliveredAt === 'string' ? new Date(o.deliveredAt).getTime() : o.deliveredAt) : undefined,
      validFrom: undefined, validTo: undefined,
    }));
    useStore.setState({ orders });
    return true;
  } catch (e) {
    return false;
  }
}

// Verifica sesión existente (cookie httpOnly) en el servidor
export async function checkServerSession(): Promise<void> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const result = await res.json();
    if (result.ok && result.session) {
      if (result.session.type === 'employee') {
        useStore.setState({ currentEmployee: result.session.employee });
      }
    }
  } catch (e) {
    // Silencioso: si falla, no hacer nada
  }
}
