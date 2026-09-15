'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

  // Promociones (admin)
  savePromotion: (p: Promotion) => void;
  togglePromotionActive: (id: string) => void;
  deletePromotion: (id: string) => void;

  // Empleados
  saveEmployee: (e: Employee) => void;
  toggleEmployeeActive: (id: string) => void;
  deleteEmployee: (id: string) => void;
  loginEmployee: (username: string, password: string) => boolean;
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

export const useStore = create<Store>()(
  persist(
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

      clearCart: () => set({ cart: [] }),

      // ===== Pedidos =====
      placeOrder: (data) => {
        const cart = get().cart;
        let subtotal = 0;
        let extras = 0;
        for (const item of cart) {
          subtotal += item.unitPrice * item.qty;
          extras += item.extrasTotal * item.qty;
        }
        const base = subtotal + extras;
        const discount = data.discount || 0;
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
          total: Math.max(0, base - discount),
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
          currentView: 'tracking',
          selectedOrderId: order.id,
          logs: [
            {
              id: uid('log'),
              user: data.customerName,
              action: 'Nuevo pedido',
              detail: `Código ${order.code} - Total provisional ${order.total}`,
              date: Date.now(),
            },
            ...s.logs,
          ],
        }));
        return order;
      },

      updateOrder: (id, patch) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),

      setOrderState: (id, state) =>
        set((s) => {
          const user = s.currentEmployee?.name || 'Sistema';
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          const patch: Partial<Order> = { state };
          if (state === 'confirmado') patch.confirmedAt = Date.now();
          if (state === 'entregado') patch.deliveredAt = Date.now();
          return {
            orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
            logs: [
              {
                id: uid('log'),
                user,
                action: 'Cambio de estado',
                detail: `Pedido ${order.code}: ${state}`,
                date: Date.now(),
              },
              ...s.logs,
            ],
          };
        }),

      setOrderDelivery: (id, delivery) =>
        set((s) => {
          const user = s.currentEmployee?.name || 'Sistema';
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          const newTotal = Math.max(0, order.subtotal + order.extras - order.discount + delivery);
          return {
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, delivery, total: newTotal } : o
            ),
            logs: [
              {
                id: uid('log'),
                user,
                action: 'Cambio de domicilio',
                detail: `Pedido ${order.code}: domicilio = ${delivery} CUP`,
                date: Date.now(),
              },
              ...s.logs,
            ],
          };
        }),

      assignDelivery: (orderId, employeeId) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, assignedDelivery: employeeId, state: 'camino' } : o
          ),
        })),

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
          if (exists) {
            return { employees: s.employees.map((x) => (x.id === e.id ? e : x)) };
          }
          return { employees: [...s.employees, e] };
        }),
      toggleEmployeeActive: (id) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, active: !e.active } : e
          ),
        })),

      deleteEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),

      loginEmployee: (username, password) => {
        const emp = get().employees.find(
          (e) => e.username === username && e.password === password && e.active
        );
        if (emp) {
          set((s) => ({
            currentEmployee: emp,
            logs: [
              {
                id: uid('log'),
                user: emp.name,
                action: 'Inicio de sesión',
                detail: `Rol: ${emp.role}`,
                date: Date.now(),
              },
              ...s.logs,
            ],
          }));
          return true;
        }
        return false;
      },

      logoutEmployee: () => {
        const emp = get().currentEmployee;
        if (emp) {
          set((s) => ({
            currentEmployee: null,
            currentView: 'home',
            logs: [
              {
                id: uid('log'),
                user: emp.name,
                action: 'Cierre de sesión',
                detail: '',
                date: Date.now(),
              },
              ...s.logs,
            ],
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
          logs: [
            { id: uid('log'), user, action, detail, date: Date.now() },
            ...s.logs,
          ],
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
    }),
    {
      name: 'los-compas-pwa',
      version: 2,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (undefined as any)
      ),
      partialize: (s) => ({
        categories: s.categories,
        products: s.products,
        ingredients: s.ingredients,
        sizes: s.sizes,
        combos: s.combos,
        promotions: s.promotions,
        appliedPromoCode: s.appliedPromoCode,
        orders: s.orders,
        employees: s.employees,
        currentEmployee: s.currentEmployee,
        whatsapp: s.whatsapp,
        config: s.config,
        logs: s.logs,
        currentView: s.currentView,
      }),
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted;
        // v1 -> v2: actualizar logo al nuevo path del logo real.
        // Las promociones se cargan desde el seed automáticamente (no estaban persistidas en v1).
        if (version < 2 && persisted.config) {
          persisted.config.logo = '/logo.png';
        }
        // Limpiar campos nulos que pudieran venir de migraciones previas
        if (persisted.promotions === null) delete persisted.promotions;
        if (persisted.appliedPromoCode === null) persisted.appliedPromoCode = null;
        return persisted;
      },
    }
  )
);

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
