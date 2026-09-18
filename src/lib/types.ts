// ===== Tipos de datos LOS COMPAS PIZZERÍA =====

export type View =
  | 'home'
  | 'menu'
  | 'builder'
  | 'cart'
  | 'checkout'
  | 'tracking'
  | 'admin'
  | 'kitchen'
  | 'delivery'
  | 'login'
  | 'account';

export type CategoryId = 'pizzas' | 'comidas' | 'postres' | 'bebidas' | 'combos' | 'ingredientes';

// ===== Promociones =====
export type PromotionType =
  | 'percent'        // descuento porcentual sobre el total
  | 'fixed'          // monto fijo de descuento
  | 'free_product'   // producto gratis al superar un monto
  | 'bundle';        // 2x1 o X+Y (compra X, lleva Y)

export interface Promotion {
  id: string;
  name: string;
  description: string;
  emoji: string;
  type: PromotionType;
  value: number;          // porcentaje (0-100) o monto fijo o umbral mínimo
  freeProductId?: string;  // para free_product / bundle
  bundleBuyQty?: number;   // para bundle: cuántos hay que comprar
  bundleGetQty?: number;   // para bundle: cuántos gratis lleva
  validFrom: number;       // timestamp inicio
  validTo: number;         // timestamp fin
  active: boolean;
  code?: string;           // código promocional opcional
  appliesTo: 'all' | 'category' | 'product';
  categoryId?: string;
  productId?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  visible: boolean;
  order: number;
}

export type PizzaSize =
  | 'pequena_20'      // 20 cm
  | 'mediana_25'      // 25 cm
  | 'grande_30'       // 30 cm
  | 'rect_30x20'      // 30x20
  | 'rect_35x40'      // 35x40
  | 'familiar_42x30'  // 42x30
  | 'extra_46x36';    // 46x36

export interface SizeOption {
  id: PizzaSize;
  label: string;
  basePrice: number;       // precio "pizza de queso"
  borderDelta?: number;   // extra por "borde de queso" (precio borde = basePrice + borderDelta)
  order?: number;
}

export type IngredientQty = 'normal' | 'doble' | 'triple';

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  color: string;       // color del topping en el visualizador
  priceBySize: Partial<Record<PizzaSize, number>>;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  price: number;
  available: boolean;
  prepTime: number; // minutos
  isPizza?: boolean;
  defaultSize?: PizzaSize;
  defaultIngredients?: string[];
  isCombo?: boolean;
  comboItems?: string[];
}

export interface CartItemIngredient {
  ingredientId: string;
  qty: IngredientQty;
}

export interface CartItem {
  id: string;            // uuid local
  productId?: string;    // si es producto del catálogo
  name: string;
  emoji: string;
  unitPrice: number;     // precio del producto base
  qty: number;
  size?: PizzaSize;      // solo para pizzas
  borderCheese?: boolean;
  extrasTotal: number;   // suma de ingredientes extra
  ingredients?: CartItemIngredient[];
  isCombo?: boolean;
  notes?: string;
}

export type OrderState =
  | 'recibido'
  | 'confirmado'
  | 'preparando'
  | 'listo'
  | 'camino'
  | 'entregado'
  | 'cancelado';

export type PaymentMethod = 'efectivo' | 'transferencia';
export type TimeSlot = 'manana' | 'tarde';
export type DeliveryMode = 'domicilio' | 'recogida';

export interface Order {
  id: string;
  code: string;             // código corto visible: LC-0001
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  reference?: string;
  items: CartItem[];
  subtotal: number;
  extras: number;
  delivery: number | null;  // null = pendiente de confirmar
  discount: number;         // monto descontado por promociones
  surcharge: number;        // recargo por transferencia (30% sobre post-discount total)
  total: number;            // subtotal + extras + delivery - discount + surcharge
  paymentMethod: PaymentMethod;
  timeSlot: TimeSlot;
  deliveryMode: DeliveryMode;
  scheduledTime: string;     // ej: "12:30 PM - 01:00 PM"
  state: OrderState;
  assignedDelivery?: string; // empleado id
  createdAt: number;
  confirmedAt?: number;
  deliveredAt?: number;
  notes?: string;
}

export type Role = 'admin' | 'cocina' | 'repartidor' | 'personalizado';

export interface Permission {
  ver_pedidos: boolean;
  crear_combos: boolean;
  cambiar_estados: boolean;
  cambiar_precios: boolean;
  gestionar_productos: boolean;
  gestionar_empleados: boolean;
  gestionar_domicilio: boolean;
  ver_dashboard: boolean;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  permissions: Permission;
}

export interface WhatsAppNumber {
  id: string;
  number: string;
  name: string;
  function: 'pedidos' | 'cocina' | 'reparto' | 'todos';
  active: boolean;
}

export interface BusinessConfig {
  name: string;
  city: string;
  currency: string;
  logo: string;
  phone: string;
  address: string;
  deliveryBase: number;
  morningStart: string;  // "08:00"
  morningEnd: string;    // "10:30"
  morningDelivery: string; // "12:30 PM - 01:00 PM"
  afternoonStart: string;
  afternoonEnd: string;
  afternoonDelivery: string;
  transferSurcharge: number; // 0.30 = 30%
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  detail: string;
  date: number;
}

export interface AppState {
  // Catálogo
  categories: Category[];
  products: Product[];
  ingredients: Ingredient[];
  sizes: SizeOption[];
  combos: Product[];

  // Promociones
  promotions: Promotion[];
  appliedPromoCode: string | null;

  // Carrito actual
  cart: CartItem[];

  // Pedidos
  orders: Order[];

  // Cliente actual (para tracking): último teléfono que hizo pedido desde este dispositivo
  lastCustomerPhone: string | null;

  // FASE 3.4: Favoritos locales (productIds)
  favorites: string[];

  // Empleados
  employees: Employee[];
  currentEmployee: Employee | null;

  // WhatsApp
  whatsapp: WhatsAppNumber[];

  // Configuración
  config: BusinessConfig;

  // Historial
  logs: ActivityLog[];

  // UI
  currentView: View;
  selectedOrderId: string | null;
}
