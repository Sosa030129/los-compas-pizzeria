'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Check, ShoppingCart, ChevronLeft, Info } from 'lucide-react';
import { uid, ingredientQtyMultiplier, ingredientQtyLabel } from '@/lib/los-compas';
import { PizzaVisualizer } from '@/components/pizza-visualizer';
import type { CartItem, CartItemIngredient, IngredientQty, PizzaSize } from '@/lib/types';
import { toast } from 'sonner';

const QTY_OPTIONS: IngredientQty[] = ['normal', 'doble', 'triple'];

export function BuilderView() {
  const sizes = useStore((s) => s.sizes);
  const ingredients = useStore((s) => s.ingredients);
  const addToCart = useStore((s) => s.addToCart);
  const setView = useStore((s) => s.setView);

  const [size, setSize] = useState<PizzaSize>('familiar_42x30');
  const [border, setBorder] = useState(false);
  const [selected, setSelected] = useState<CartItemIngredient[]>([
    { ingredientId: 'queso', qty: 'normal' },
  ]);

  const currentSize = sizes.find((s) => s.id === size)!;
  const borderPrice = currentSize.basePrice * 0.20;

  const extras = selected.reduce((sum, ci) => {
    const ing = ingredients.find((i) => i.id === ci.ingredientId);
    if (!ing) return sum;
    const price = ing.priceBySize[size] || 0;
    return sum + price * ingredientQtyMultiplier(ci.qty);
  }, 0);

  const total = currentSize.basePrice + (border ? borderPrice : 0) + extras;

  const setQty = (ingredientId: string, qty: IngredientQty | null) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.ingredientId === ingredientId);
      if (qty === null) {
        return prev.filter((p) => p.ingredientId !== ingredientId);
      }
      if (exists) {
        return prev.map((p) => (p.ingredientId === ingredientId ? { ...p, qty } : p));
      }
      return [...prev, { ingredientId, qty }];
    });
  };

  const handleAddToCart = () => {
    const item: CartItem = {
      id: uid('cart'),
      name: 'Pizza Personalizada',
      emoji: '🍕',
      unitPrice: currentSize.basePrice + (border ? borderPrice : 0),
      qty: 1,
      size,
      borderCheese: border,
      extrasTotal: extras,
      ingredients: selected,
      notes: border ? 'Con borde de queso' : undefined,
    };
    addToCart(item);
    toast.success('Pizza personalizada agregada al carrito');
    setView('cart');
  };

  return (
    <div className="animate-screen-enter pb-32">
      {/* Header con pizza visual */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-secondary to-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setView('menu')}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-cartoon text-base">Arma tu pizza</h1>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="font-cartoon text-base text-primary">
              {total.toLocaleString('es-CU')} CUP
            </p>
          </div>
        </div>

        <div className="relative h-56 sm:h-64 flex items-center justify-center">
          <motion.div
            key={JSON.stringify(selected) + size + border}
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 18 }}
            className="w-44 h-44 sm:w-52 sm:h-52"
          >
            <PizzaVisualizer
              size={size}
              ingredients={selected}
              allIngredients={ingredients}
              borderCheese={border}
              className="w-full h-full"
            />
          </motion.div>
        </div>
      </div>

      {/* Tamaño */}
      <section className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-cartoon text-sm">Tamaño</h2>
          <span className="text-xs text-muted-foreground">
            <Info size={11} className="inline mr-0.5" />
            Define el precio base
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {sizes.map((s) => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              className={`p-2 rounded-xl border-2 text-left transition ${
                size === s.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-accent/20'
              }`}
            >
              <div className="text-[11px] font-bold leading-tight">{s.label}</div>
              <div className="text-[11px] text-primary font-bold">
                {s.basePrice.toLocaleString('es-CU')} CUP
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Borde de queso */}
      <section className="max-w-3xl mx-auto px-4 py-3">
        <button
          onClick={() => setBorder(!border)}
          className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between transition ${
            border ? 'border-primary bg-primary/10' : 'border-border bg-card'
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-bold">🧀 Borde de queso</p>
            <p className="text-[11px] text-muted-foreground">+{borderPrice.toLocaleString('es-CU')} CUP</p>
          </div>
          <span
            className={`w-12 h-7 rounded-full transition-colors flex items-center ${
              border ? 'bg-primary' : 'bg-muted-foreground'
            }`}
          >
            <motion.span
              layout
              className="w-5 h-5 bg-white rounded-full mx-1"
              animate={{ x: border ? 22 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </span>
        </button>
      </section>

      {/* Ingredientes */}
      <section className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-cartoon text-sm">Ingredientes extra</h2>
          <span className="text-xs text-muted-foreground">
            Subtotal: <strong className="text-primary">{extras.toLocaleString('es-CU')} CUP</strong>
          </span>
        </div>

        <div className="space-y-2">
          {ingredients
            .filter((i) => i.available)
            .map((ing) => {
              const selectedIng = selected.find((s) => s.ingredientId === ing.id);
              const qty = selectedIng?.qty;
              const price = ing.priceBySize[size] || 0;
              return (
                <motion.div
                  key={ing.id}
                  layout
                  className="cartoon-border bg-card rounded-2xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ing.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">{ing.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        +{price.toLocaleString('es-CU')} CUP / porción
                      </p>
                    </div>

                    {/* Selector de cantidad */}
                    <div className="flex items-center gap-1">
                      {qty ? (
                        <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
                          {QTY_OPTIONS.map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                if (q === qty) {
                                  setQty(ing.id, null);
                                } else {
                                  setQty(ing.id, q);
                                }
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
                                qty === q
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {q === 'normal' ? 'N' : q === 'doble' ? 'D' : 'T'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setQty(ing.id, 'normal')}
                          className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center animate-button-pop"
                          aria-label={`Añadir ${ing.name}`}
                        >
                          <Plus size={16} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {qty && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                          {ingredientQtyLabel(qty)} · Subtotal:{' '}
                          <strong className="text-foreground">
                            {(price * ingredientQtyMultiplier(qty)).toLocaleString('es-CU')} CUP
                          </strong>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
        </div>
      </section>

      {/* Resumen sticky */}
      <div className="fixed bottom-16 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t-2 border-primary/30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground">
              {currentSize.label}{border ? ' · Borde queso' : ''} · {selected.length} ing.
            </p>
            <p className="font-cartoon text-base text-primary">
              {total.toLocaleString('es-CU')} CUP
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={selected.length === 0}
            className="bg-primary text-primary-foreground px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-95 animate-button-pop disabled:opacity-50"
          >
            <ShoppingCart size={16} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
