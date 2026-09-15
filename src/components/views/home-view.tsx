'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Pizza, ShoppingBag, Clock, MapPin, ChefHat, Bike } from 'lucide-react';
import { isAnyOrderSlotOpen } from '@/lib/los-compas';
import { PizzaVisualizer } from '@/components/pizza-visualizer';

export function HomeView() {
  const config = useStore((s) => s.config);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const setView = useStore((s) => s.setView);
  const orderOpen = isAnyOrderSlotOpen(config);

  const featured = products
    .filter((p) => p.available && !p.isCombo && !p.isPizza)
    .slice(0, 6);

  const pizzaProducts = products.filter((p) => p.isPizza && p.available);

  return (
    <div className="animate-screen-enter">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary to-card border-b border-border">
        <div className="absolute -right-16 -top-16 opacity-25 pointer-events-none">
          <PizzaVisualizer
            size="familiar_42x30"
            ingredients={[
              { ingredientId: 'queso', qty: 'normal' },
              { ingredientId: 'salchicha', qty: 'doble' },
              { ingredientId: 'jamon', qty: 'normal' },
            ]}
            allIngredients={[]}
            borderCheese={false}
            className="w-56 h-56"
          />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-8">
          <div className="inline-flex items-center gap-1.5 bg-primary/15 text-primary px-2.5 py-1 rounded-full text-[11px] font-bold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
            {orderOpen ? 'ABIERTO AHORA' : 'FUERA DE HORARIO'}
          </div>
          <h1 className="font-cartoon text-3xl sm:text-4xl leading-[1.05] text-foreground">
            🍕 LOS <span className="text-primary">COMPAS</span>
            <br />
            PIZZERÍA
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Pide tu pizza favorita en {config.city}. Sabor cartoon, ingredientes abundantes y entrega a domicilio.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setView('menu')}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-bold text-sm hover:opacity-95 transition animate-button-pop shadow-lg shadow-primary/20"
            >
              Ver Menú
            </button>
            <button
              onClick={() => setView('builder')}
              className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-full font-bold text-sm hover:bg-secondary/70 transition border border-border"
            >
              <Pizza size={16} className="inline mr-1.5 -mt-0.5" /> Armar mi pizza
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              Mañana {config.morningStart}–{config.morningEnd} · Tardes {config.afternoonStart}–{config.afternoonEnd}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-primary" />
              {config.address}
            </span>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="font-cartoon text-lg mb-3">Categorías</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {categories
            .filter((c) => c.visible)
            .map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setView('menu');
                  setTimeout(() => {
                    const el = document.getElementById(`cat-${c.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="cartoon-border bg-card rounded-2xl p-4 flex flex-col items-center gap-1.5 hover:bg-accent/20 transition group"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform">{c.emoji}</span>
                <span className="font-cartoon text-sm">{c.name}</span>
              </motion.button>
            ))}
        </div>
      </section>

      {/* Pizza showcase */}
      <section className="max-w-3xl mx-auto px-4 pb-6">
        <div className="rounded-3xl cartoon-border-primary bg-gradient-to-br from-card to-secondary p-5">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 4, -4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="shrink-0 w-24 h-24"
            >
              <PizzaVisualizer
                size="familiar_42x30"
                ingredients={[
                  { ingredientId: 'queso', qty: 'normal' },
                  { ingredientId: 'salchicha', qty: 'normal' },
                  { ingredientId: 'jamon', qty: 'normal' },
                  { ingredientId: 'pina', qty: 'normal' },
                ]}
                allIngredients={[]}
                borderCheese
                className="w-full h-full"
              />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-cartoon text-lg text-foreground">Arma tu pizza</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Elige tamaño, borde de queso, ingredientes extra. ¡Tú mandas!
              </p>
              <button
                onClick={() => setView('builder')}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-xs animate-button-pop"
              >
                Probar ahora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pizzas destacadas */}
      <section className="max-w-3xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-cartoon text-lg">Pizzas</h2>
          <button
            onClick={() => setView('menu')}
            className="text-xs text-primary font-bold hover:underline"
          >
            Ver todo →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {pizzaProducts.slice(0, 4).map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setView('menu')}
              className="cartoon-border bg-card rounded-2xl p-3 text-left hover:bg-accent/20 transition"
            >
              <div className="aspect-square mb-2 flex items-center justify-center">
                <span className="text-5xl">{p.emoji}</span>
              </div>
              <h3 className="font-cartoon text-sm">{p.name}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 min-h-[28px]">
                {p.description}
              </p>
              <span className="mt-1 inline-block text-xs font-bold text-primary">
                Desde 800 CUP
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Comidas adicionales */}
      <section className="max-w-3xl mx-auto px-4 pb-6">
        <h2 className="font-cartoon text-lg mb-3">También puedes pedir</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {featured.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setView('menu')}
              className="min-w-[140px] cartoon-border bg-card rounded-2xl p-3 text-left hover:bg-accent/20 transition"
            >
              <div className="aspect-square flex items-center justify-center mb-2">
                <span className="text-4xl">{p.emoji}</span>
              </div>
              <h3 className="font-cartoon text-xs leading-tight">{p.name}</h3>
              <span className="mt-1 block text-xs font-bold text-primary">
                {p.price.toLocaleString('es-CU')} CUP
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="font-cartoon text-lg mb-3">Cómo funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: ShoppingBag, title: '1. Elige', desc: 'Menú o arma tu pizza' },
            { icon: ChefHat, title: '2. Preparamos', desc: 'Cocina fresca, estado real' },
            { icon: Bike, title: '3. Llega', desc: 'Delivery o recogida' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="cartoon-border bg-card rounded-2xl p-4 flex items-start gap-3"
              >
                <span className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </span>
                <div>
                  <h3 className="font-cartoon text-sm">{s.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
