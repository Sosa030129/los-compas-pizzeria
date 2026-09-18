import type {
  BusinessConfig,
  Category,
  Employee,
  Ingredient,
  Product,
  Promotion,
  SizeOption,
  WhatsAppNumber,
} from './types';

// ============================================================
// PRECIOS SEGÚN SPEC DEL NEGOCIO (NO MODIFICAR SIN AUTORIZACIÓN)
// Pizza queso / pizza borde queso como precios absolutos por tamaño
// ============================================================

export const SIZES: SizeOption[] = [
  // basePrice = precio "pizza de queso"
  // borderDelta = extra por "borde de queso" (precio borde = basePrice + borderDelta)
  { id: 'pequena_20', label: 'Pequeña 20cm', basePrice: 600, borderDelta: 150 },
  { id: 'mediana_25', label: 'Mediana 25cm', basePrice: 800, borderDelta: 150 },
  { id: 'grande_30', label: 'Grande 30cm', basePrice: 900, borderDelta: 150 },
  { id: 'rect_30x20', label: 'Rect. Pequeña 30×20cm', basePrice: 850, borderDelta: 150 },
  { id: 'rect_35x40', label: 'Rect. Mediana 35×40cm', basePrice: 1800, borderDelta: 300 },
  { id: 'familiar_42x30', label: 'Familiar 42×30cm', basePrice: 2200, borderDelta: 500 },
  { id: 'extra_46x36', label: 'Extra Familiar 46×36cm', basePrice: 2450, borderDelta: 550 },
];

// Tamaños "pequeños" (usan priceSmall de cada ingrediente)
export const SMALL_SIZES = ['pequena_20', 'mediana_25', 'grande_30', 'rect_30x20'] as const;
// Tamaños "familiares" (usan priceFamily de cada ingrediente)
export const FAMILY_SIZES = ['rect_35x40', 'familiar_42x30', 'extra_46x36'] as const;

// Ingredientes: 2 precios (pequeñas / familiares) según spec del negocio.
// priceBySize se sintetiza a partir de estos 2 precios para mantener compatibilidad
// con el tipo Ingredient.priceBySize actual (Partial<Record<PizzaSize, number>>).
const RAW_INGREDIENTS: Array<[string, string, string, string, number, number]> = [
  ['queso', 'Queso extra', '🧀', '#ffd966', 250, 700],
  ['jamon', 'Jamón', '🍖', '#e07a6b', 230, 580],
  ['salchicha', 'Salchicha', '🌭', '#b8302a', 350, 750],
  ['pina', 'Piña', '🍍', '#f6c945', 200, 550],
  ['vegetales', 'Vegetales', '🥬', '#3a7a2b', 200, 500],
  ['cebolla', 'Cebolla', '🧅', '#f0e3c4', 180, 450],
  ['champinones', 'Champiñones', '🍄', '#c4a080', 200, 500],
  ['aji', 'Ají', '🌶️', '#d23a3a', 150, 350],
];

export const INGREDIENTS: Ingredient[] = RAW_INGREDIENTS.map(([id, name, emoji, color, priceSmall, priceFamily]) => {
  // Sintetizar priceBySize para compatibilidad hacia atrás
  const priceBySize: Partial<Record<string, number>> = {};
  for (const s of SMALL_SIZES) priceBySize[s] = priceSmall;
  for (const s of FAMILY_SIZES) priceBySize[s] = priceFamily;
  return {
    id,
    name,
    emoji,
    color,
    priceBySize: priceBySize as Ingredient['priceBySize'],
    available: true,
  };
});

export const CATEGORIES: Category[] = [
  { id: 'pizzas', name: 'Pizzas', emoji: '🍕', visible: true, order: 1 },
  { id: 'comidas', name: 'Comidas', emoji: '🌮', visible: true, order: 2 },
  { id: 'postres', name: 'Postres', emoji: '🍩', visible: true, order: 3 },
  { id: 'bebidas', name: 'Bebidas', emoji: '🥤', visible: true, order: 4 },
  { id: 'combos', name: 'Combos', emoji: '🎉', visible: true, order: 5 },
];

export const PRODUCTS: Product[] = [
  // ===== PIZZAS PREDETERMINADAS (5) =====
  {
    id: 'pizza_custom',
    name: 'Pizza Personalizada',
    description: 'Pizza armada por el cliente con ingredientes a elección.',
    category: 'pizzas',
    emoji: '🍕',
    price: 0,
    available: true,
    isPizza: true,
    defaultSize: 'familiar_42x30',
    defaultIngredients: ['queso'],
  },
  {
    id: 'pizza_muzzarella',
    name: 'Pizza Muzzarella',
    description: 'Clásica: masa artesanal, salsa de tomate y queso fundido.',
    category: 'pizzas',
    emoji: '🍕',
    price: 0,
    available: true,
    isPizza: true,
    defaultSize: 'familiar_42x30',
    defaultIngredients: ['queso'],
  },
  {
    id: 'pizza_especial',
    name: 'Pizza Especial',
    description: 'Queso, jamón y salchicha. La favorita de la casa.',
    category: 'pizzas',
    emoji: '🍕',
    price: 0,
    available: true,
    isPizza: true,
    defaultSize: 'familiar_42x30',
    defaultIngredients: ['queso', 'jamon', 'salchicha'],
  },
  {
    id: 'pizza_hawaiana',
    name: 'Pizza Hawaiana',
    description: 'Jamón, piña y queso. Dulce y salada a la vez.',
    category: 'pizzas',
    emoji: '🍕',
    price: 0,
    available: true,
    isPizza: true,
    defaultSize: 'familiar_42x30',
    defaultIngredients: ['queso', 'jamon', 'pina'],
  },
  {
    id: 'pizza_vegetal',
    name: 'Pizza Vegetal',
    description: 'Vegetales frescos, cebolla y champiñones.',
    category: 'pizzas',
    emoji: '🍕',
    price: 0,
    available: true,
    isPizza: true,
    defaultSize: 'familiar_42x30',
    defaultIngredients: ['queso', 'vegetales', 'cebolla', 'champinones'],
  },

  // ===== COMIDAS (7) =====
  {
    id: 'tacos_salchicha',
    name: 'Tacos de Salchicha',
    description: '3 tacos crujientes rellenos de salchicha.',
    category: 'comidas',
    emoji: '🌮',
    price: 1000,
    available: true,
  },
  {
    id: 'tacos_jamon',
    name: 'Tacos de Jamón',
    description: '3 tacos crujientes rellenos de jamón.',
    category: 'comidas',
    emoji: '🌮',
    price: 1000,
    available: true,
  },
  {
    id: 'empanadas_queso',
    name: 'Empanadas de Queso',
    description: '5 empanadas crujientes con queso fundido.',
    category: 'comidas',
    emoji: '🥟',
    price: 1400,
    available: true,
  },
  {
    id: 'espaguetis_queso',
    name: 'Espaguetis de Queso',
    description: 'Pasta italiana con salsa de tomate y queso fundido.',
    category: 'comidas',
    emoji: '🍝',
    price: 600,
    available: true,
  },
  {
    id: 'tostones_normales',
    name: 'Tostones Naturales',
    description: 'Plátano verde frito, crujiente y salado.',
    category: 'comidas',
    emoji: '🍌',
    price: 450,
    available: true,
  },
  {
    id: 'tostones_ajo',
    name: 'Tostones de Ajo',
    description: 'Tostones con aliño de ajo y hierbas.',
    category: 'comidas',
    emoji: '🍌',
    price: 550,
    available: true,
  },
  {
    id: 'tostones_rellenos',
    name: 'Tostones Rellenos',
    description: 'Tostones rellenos de jamón y queso.',
    category: 'comidas',
    emoji: '🍌',
    price: 600,
    available: true,
  },

  // ===== POSTRES (7) =====
  {
    id: 'donas_nutella',
    name: 'Donas con Nutella',
    description: '6 donas con relleno de Nutella.',
    category: 'postres',
    emoji: '🍩',
    price: 1000,
    available: true,
  },
  {
    id: 'donas_cubierta_nutella',
    name: 'Donas con Cubierta y Relleno de Nutella',
    description: '6 donas con cubierta y relleno de crema de cacao.',
    category: 'postres',
    emoji: '🍩',
    price: 1800,
    available: true,
  },
  {
    id: 'berlinesas',
    name: 'Berlinesas con Nutella',
    description: '6 berlinesas rellenas de crema de cacao.',
    category: 'postres',
    emoji: '🍫',
    price: 1300,
    available: true,
  },
  {
    id: 'rosquitas_azucar',
    name: 'Rosquitas con Azúcar',
    description: '10 rosquitas crujientes con azúcar.',
    category: 'postres',
    emoji: '🍩',
    price: 800,
    available: true,
  },
  {
    id: 'rosquitas_rellenas',
    name: 'Rosquitas Rellenas con Nutella',
    description: '6 rosquitas rellenas con crema de cacao.',
    category: 'postres',
    emoji: '🍩',
    price: 1300,
    available: true,
  },
  {
    id: 'helados',
    name: 'Helados',
    description: 'Copa de helado, sabor a elegir.',
    category: 'postres',
    emoji: '🍦',
    price: 500,
    available: true,
  },
  {
    id: 'helados_potes',
    name: 'Potes de Helado',
    description: 'Pote de helado individual.',
    category: 'postres',
    emoji: '🍦',
    price: 350,
    available: true,
  },

  // ===== BEBIDAS (11) =====
  {
    id: 'batidos',
    name: 'Batidos Naturales',
    description: 'Batido de frutas naturales (mango, plátano, papaya).',
    category: 'bebidas',
    emoji: '🥤',
    price: 600,
    available: true,
  },
  {
    id: 'colada',
    name: 'Colada',
    description: 'Café cubano tradicional, 4 pocillos.',
    category: 'bebidas',
    emoji: '☕',
    price: 600,
    available: true,
  },
  {
    id: 'malteada',
    name: 'Malteada',
    description: 'Malteada cremosa de chocolate, fresa o vainilla.',
    category: 'bebidas',
    emoji: '🥤',
    price: 650,
    available: true,
  },
  {
    id: 'limonada',
    name: 'Limonada',
    description: 'Limonada fresca con o sin menta.',
    category: 'bebidas',
    emoji: '🍋',
    price: 500,
    available: true,
  },
  {
    id: 'limonada_brasilera',
    name: 'Limonada Brasilera',
    description: 'Limonada cremosa con leche condensada.',
    category: 'bebidas',
    emoji: '🍋',
    price: 600,
    available: true,
  },
  {
    id: 'smoothie',
    name: 'Smoothie',
    description: 'Smoothie de frutas tropicales.',
    category: 'bebidas',
    emoji: '🥤',
    price: 700,
    available: true,
  },
  {
    id: 'batido_nutella',
    name: 'Batido de Nutella',
    description: 'Batido cremoso con crema de cacao.',
    category: 'bebidas',
    emoji: '🥤',
    price: 700,
    available: true,
  },
  {
    id: 'jugos',
    name: 'Jugos Naturales',
    description: 'Jugos naturales de frutas de la temporada.',
    category: 'bebidas',
    emoji: '🧃',
    price: 400,
    available: true,
  },
  {
    id: 'refrescos',
    name: 'Refresco de Lata',
    description: 'Lata de refresco nacional 350ml.',
    category: 'bebidas',
    emoji: '🥤',
    price: 550,
    available: true,
  },
  {
    id: 'cerveza',
    name: 'Cerveza',
    description: 'Cerveza nacional lata 355ml.',
    category: 'bebidas',
    emoji: '🍺',
    price: 600,
    available: true,
  },
  {
    id: 'malta',
    name: 'Malta',
    description: 'Malta fría 350ml.',
    category: 'bebidas',
    emoji: '🍺',
    price: 600,
    available: true,
  },

  // ===== COMBOS (2) =====
  {
    id: 'combo_familiar',
    name: 'Combo Familiar',
    description: 'Pizza familiar 42×30 + 2 bebidas + 1 postre.',
    category: 'combos',
    emoji: '🎉',
    price: 3200,
    available: true,
    isCombo: true,
    comboItems: ['pizza_especial', 'refrescos', 'refrescos', 'helados'],
  },
  {
    id: 'combo_duo',
    name: 'Combo Duo',
    description: '2 pizzas medianas 25cm + 1 bebida grande.',
    category: 'combos',
    emoji: '🎉',
    price: 2900,
    available: true,
    isCombo: true,
    comboItems: ['pizza_muzzarella', 'pizza_especial', 'malteada'],
  },
];

export const COMBOS: Product[] = PRODUCTS.filter((p) => p.isCombo);

export const EMPLOYEES: Employee[] = [
  {
    id: 'emp_admin',
    name: 'Administrador',
    phone: '+53 55000000',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    active: true,
    permissions: {
      ver_pedidos: true, crear_combos: true, cambiar_estados: true,
      cambiar_precios: true, gestionar_productos: true, gestionar_empleados: true,
      gestionar_domicilio: true, ver_dashboard: true,
    },
  },
  {
    id: 'emp_cocina',
    name: 'Chef Cocina',
    phone: '+53 55000001',
    username: 'cocina',
    password: 'cocina123',
    role: 'cocina',
    active: true,
    permissions: {
      ver_pedidos: true, crear_combos: true, cambiar_estados: true,
      cambiar_precios: false, gestionar_productos: false, gestionar_empleados: false,
      gestionar_domicilio: false, ver_dashboard: false,
    },
  },
  {
    id: 'emp_reparto',
    name: 'Repartidor Juan',
    phone: '+53 55000002',
    username: 'reparto',
    password: 'reparto123',
    role: 'repartidor',
    active: true,
    permissions: {
      ver_pedidos: true, crear_combos: false, cambiar_estados: true,
      cambiar_precios: false, gestionar_productos: false, gestionar_empleados: false,
      gestionar_domicilio: false, ver_dashboard: false,
    },
  },
];

export const WHATSAPP: WhatsAppNumber[] = [
  { id: 'wa1', number: '+53 55000000', name: 'WhatsApp Principal', function: 'pedidos', active: true },
  { id: 'wa2', number: '+53 55000001', name: 'Cocina', function: 'cocina', active: true },
  { id: 'wa3', number: '+53 55000002', name: 'Reparto', function: 'reparto', active: true },
];

export const CONFIG: BusinessConfig = {
  name: 'LOS COMPAS',
  city: 'Sancti Spíritus, Cuba',
  currency: 'CUP',
  logo: '/logo.png',
  phone: '+53 55000000',
  address: 'Sancti Spíritus, Cuba',
  deliveryBase: 250,
  morningStart: '08:00',
  morningEnd: '10:30',
  morningDelivery: '12:30 PM - 01:00 PM',
  afternoonStart: '13:00',
  afternoonEnd: '16:30',
  afternoonDelivery: '06:30 PM - 07:00 PM',
  transferSurcharge: 0.30,
};

// Promociones semilla - las fechas se calculan dinámicamente para que siempre
// estén activas cuando se carga la app por primera vez
const now = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

export const PROMOTIONS: Promotion[] = [
  {
    id: 'promo_combo_2x1_pizzas',
    name: '2x1 en Pizzas Medianas',
    description: 'Compra 2 pizzas medianas 25cm y llévate 2 (¡la 2da es gratis!). Solo en horario de almuerzo.',
    emoji: '🍕',
    type: 'bundle',
    value: 0,
    bundleBuyQty: 1,
    bundleGetQty: 1,
    validFrom: now,
    validTo: now + ONE_WEEK * 4,
    active: true,
    code: '2X1PIZZA',
    appliesTo: 'category',
    categoryId: 'pizzas',
  },
  {
    id: 'promo_miercoles_15pct',
    name: 'Miércoles Promocional -15%',
    description: 'Todos los miércoles, 15% de descuento en todo tu pedido. Solo con código PROMO15.',
    emoji: '🎉',
    type: 'percent',
    value: 15,
    validFrom: now,
    validTo: now + ONE_WEEK * 8,
    active: true,
    code: 'PROMO15',
    appliesTo: 'all',
  },
  {
    id: 'promo_bebida_gratis',
    name: 'Bebida gratis en pedidos +3000 CUP',
    description: 'En pedidos superiores a 3000 CUP, te regalamos un refresco nacional.',
    emoji: '🥤',
    type: 'free_product',
    value: 3000,
    freeProductId: 'refrescos',
    validFrom: now,
    validTo: now + ONE_WEEK * 4,
    active: true,
    appliesTo: 'all',
  },
  {
    id: 'promo_combo_familiar_ahorro',
    name: 'Ahorro Extra en Combo Familiar -500 CUP',
    description: 'Llévate el Combo Familiar con 500 CUP de descuento directo.',
    emoji: '💰',
    type: 'fixed',
    value: 500,
    validFrom: now,
    validTo: now + ONE_WEEK * 2,
    active: true,
    code: 'COMBO500',
    appliesTo: 'product',
    productId: 'combo_familiar',
  },
];

// Estados de pedido para visualización
export const ORDER_STATES = [
  { id: 'recibido', label: 'Recibido', emoji: '📋', color: '#8a7a5a' },
  { id: 'confirmado', label: 'Confirmado', emoji: '✅', color: '#c4a060' },
  { id: 'preparando', label: 'Preparando', emoji: '👨‍🍳', color: '#d49050' },
  { id: 'listo', label: 'Listo', emoji: '📦', color: '#7ab860' },
  { id: 'camino', label: 'En camino', emoji: '🛵', color: '#5a9ab8' },
  { id: 'entregado', label: 'Entregado', emoji: '🎉', color: '#7a1f2b' },
  { id: 'cancelado', label: 'Cancelado', emoji: '❌', color: '#7a1f1f' },
] as const;
