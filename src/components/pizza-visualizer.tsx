'use client';

import { motion } from 'framer-motion';
import type { CartItemIngredient, Ingredient, PizzaSize } from '@/lib/types';

interface Props {
  size: PizzaSize;
  ingredients: CartItemIngredient[];
  allIngredients: Ingredient[];
  borderCheese: boolean;
  className?: string;
}

interface Point { x: number; y: number; r: number; rot: number; }

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distribution(count: number, seed: number): Point[] {
  const rng = mulberry32(seed);
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 0.10 + rng() * 0.66;
    out.push({
      x: 50 + Math.cos(angle) * radius * 50,
      y: 50 + Math.sin(angle) * radius * 50,
      r: 4 + rng() * 4,
      rot: rng() * 360,
    });
  }
  return out;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function IngredientShape({ ing, p }: { ing: Ingredient; p: Point }) {
  const cx = p.x * 2;
  const cy = p.y * 2;

  if (ing.id === 'cebolla' || ing.id === 'champinones') {
    return (
      <circle
        cx={cx} cy={cy} r={p.r * 1.6}
        fill="none" stroke={ing.color} strokeWidth="2.2" opacity="0.95"
        transform={`rotate(${p.rot} ${cx} ${cy})`}
      />
    );
  }

  if (ing.id === 'vegetales') {
    return (
      <ellipse
        cx={cx} cy={cy} rx={p.r * 1.4} ry={p.r * 0.7}
        fill={ing.color} opacity="0.95"
        transform={`rotate(${p.rot} ${cx} ${cy})`}
      />
    );
  }

  // Pepperoni / redondo por defecto
  return (
    <g>
      <circle
        cx={cx} cy={cy} r={p.r * 1.8}
        fill={ing.color}
        stroke={shadeColor(ing.color, -30)}
        strokeWidth="1.2"
      />
      <circle cx={cx - p.r * 0.4} cy={cy - p.r * 0.4} r="0.9" fill={shadeColor(ing.color, -40)} />
      <circle cx={cx + p.r * 0.4} cy={cy + p.r * 0.4} r="0.9" fill={shadeColor(ing.color, -40)} />
    </g>
  );
}

export function PizzaVisualizer({
  size, ingredients, allIngredients, borderCheese, className,
}: Props) {
  const seed = size.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + ingredients.length;

  const active = ingredients
    .map((ci) => {
      const ing = allIngredients.find((i) => i.id === ci.ingredientId);
      if (!ing) return null;
      const mult = ci.qty === 'doble' ? 2 : ci.qty === 'triple' ? 3 : 1;
      return { ing, mult };
    })
    .filter(Boolean) as { ing: Ingredient; mult: number }[];

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Sombra */}
        <ellipse cx="100" cy="108" rx="92" ry="92" fill="#000" opacity="0.45" />
        {/* Borde de masa */}
        <circle cx="100" cy="100" r="92" fill={borderCheese ? '#ffd966' : '#d49050'} />
        <circle cx="100" cy="100" r="92" fill="none" stroke="#9a5a28" strokeWidth="3" />
        {/* Salsa */}
        <circle cx="100" cy="100" r="78" fill="#a8321f" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="#7a1f2b" strokeWidth="2" />
        {/* Capa queso base */}
        <circle cx="100" cy="100" r="73" fill="#ffd966" opacity="0.85" />

        {/* Ingredientes distribuidos */}
        {active.flatMap((a, i) => {
          const baseCount = a.ing.id === 'queso' ? 8 : 12;
          const count = baseCount * a.mult;
          const points = distribution(count, seed + i * 17 + a.ing.id.length);
          return points.map((p, j) => (
            <motion.g
              key={`${a.ing.id}-${i}-${j}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: j * 0.015 + i * 0.05, type: 'spring' }}
              style={{ transformOrigin: `${p.x}% ${p.y}%` }}
            >
              <IngredientShape ing={a.ing} p={p} />
            </motion.g>
          ));
        })}

        {/* Brillo cartoon */}
        <ellipse cx="75" cy="70" rx="18" ry="8" fill="#fff" opacity="0.18" transform="rotate(-30 75 70)" />
      </svg>
    </div>
  );
}
