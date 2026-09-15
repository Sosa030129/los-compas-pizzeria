'use client';

import { useStore } from '@/lib/store';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X } from 'lucide-react';
import { uid } from '@/lib/los-compas';
import type { CartItem, Product } from '@/lib/types';
import { toast } from 'sonner';

export function MenuView() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const sizes = useStore((s) => s.sizes);
  const ingredients = useStore((s) => s.ingredients);
  const addToCart = useStore((s) => s.addToCart);
  const setView = useStore((s) => s.setView);

  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [quickAdd, setQuickAdd] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, activeCat, query]);

  const cats = categories.filter((c) => c.visible).sort((a, b) => a.order - b.order);

  const handleQuickAdd = (p: Product) => {
    if (p.isPizza) {
      setQuickAdd(p);
    } else {
      const item: CartItem = {
        id: uid('cart'),
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        unitPrice: p.price,
        qty: 1,
        extrasTotal: 0,
      };
      addToCart(item);
      toast.success(`${p.name} agregado al carrito`);
    }
  };

  const confirmPizzaQuick = (p: Product, sizeId: string) => {
    const size = sizes.find((s) => s.id === sizeId)!;
    const item: CartItem = {
      id: uid('cart'),
      productId: p.id,
      name: p.name,
      emoji: p.emoji,
      unitPrice: size.basePrice,
      qty: 1,
      size: size.id,
      extrasTotal: 0,
      ingredients: p.defaultIngredients?.map((ingId) => ({ ingredientId: ingId, qty: 'normal' as const })) || [],
    };
    addToCart(item);
    toast.success(`${p.name} (${size.label}) agregada`);
    setQuickAdd(null);
  };

  return (
    <div className="animate-screen-enter pb-24">
      {/* Búsqueda */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="relative max-w-3xl mx-auto">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-card border border-border rounded-full pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1 -mx-4 px-4 max-w-3xl mx-auto">
          <CategoryChip active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="Todos" emoji="🍽️" />
          {cats.map((c) => (
            <CategoryChip
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              label={c.name}
              emoji={c.emoji}
            />
          ))}
        </div>
      </div>

      {/* Listado */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {cats.map((cat) => {
          const items = filtered.filter((p) => p.category === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-7">
              <h2 className="font-cartoon text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">{cat.emoji}</span> {cat.name}
                <span className="text-xs text-muted-foreground font-normal ml-1">({items.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {items.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    className={`cartoon-border bg-card rounded-2xl p-3 flex flex-col ${
                      !p.available ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="aspect-square flex items-center justify-center mb-2">
                      <span className={`text-5xl ${p.isPizza ? 'animate-spin-slow' : ''}`}>{p.emoji}</span>
                    </div>
                    <h3 className="font-cartoon text-sm leading-tight">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 min-h-[28px]">
                      {p.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        {p.isPizza ? 'Desde ' : ''}
                        {p.isPizza
                          ? Math.min(...sizes.map((s) => s.basePrice)).toLocaleString('es-CU')
                          : p.price.toLocaleString('es-CU')}{' '}
                        CUP
                      </span>
                      {p.available ? (
                        <button
                          onClick={() => handleQuickAdd(p)}
                          className="bg-primary text-primary-foreground w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 animate-button-pop"
                          aria-label={`Agregar ${p.name}`}
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      ) : (
                        <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-1 rounded-full font-bold">
                          Agotado
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-sm">No encontramos productos para "{query}"</p>
            <button
              onClick={() => { setQuery(''); setActiveCat('all'); }}
              className="mt-3 text-xs text-primary font-bold hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Modal de tamaño rápido para pizza */}
      <AnimatePresence>
        {quickAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickAdd(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{quickAdd.emoji}</span>
                  <div>
                    <h3 className="font-cartoon text-base">{quickAdd.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{quickAdd.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickAdd(null)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs font-bold text-muted-foreground mb-2">Elige el tamaño:</p>
              <div className="grid grid-cols-1 gap-1.5 mb-4">
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => confirmPizzaQuick(quickAdd, s.id)}
                    className="flex items-center justify-between bg-secondary/60 hover:bg-secondary transition rounded-xl px-3 py-2.5 text-left"
                  >
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-sm font-bold text-primary">
                      {s.basePrice.toLocaleString('es-CU')} CUP
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setView('builder'); setQuickAdd(null); }}
                className="w-full text-xs text-primary font-bold py-2 border border-primary rounded-full hover:bg-primary/10"
              >
                ✨ Personalizar ingredientes →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryChip({
  active, onClick, label, emoji,
}: { active: boolean; onClick: () => void; label: string; emoji: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
      }`}
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}
