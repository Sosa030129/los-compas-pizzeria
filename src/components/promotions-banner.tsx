'use client';

import { useStore } from '@/lib/store';
import { activePromotions } from '@/lib/los-compas';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function PromotionsBanner() {
  const promotions = useStore((s) => s.promotions);
  const [idx, setIdx] = useState(0);

  const active = activePromotions(promotions);

  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % active.length);
    }, 5000);
    return () => clearInterval(t);
  }, [active.length]);

  if (active.length === 0) return null;

  const promo = active[idx % active.length];

  return (
    <div className="max-w-3xl mx-auto px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/30 via-primary/15 to-primary/30 border-2 border-primary/40 cartoon-border-primary">
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -right-6 -top-6 text-9xl">{promo.emoji}</div>
        </div>

        <div className="relative p-3 flex items-center gap-3">
          <motion.div
            key={promo.id}
            initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-4xl shrink-0"
          >
            {promo.emoji}
          </motion.div>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-cartoon text-sm text-primary">{promo.name}</h3>
                  {promo.code && (
                    <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Código: {promo.code}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {promo.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicadores */}
          {active.length > 1 && (
            <div className="flex gap-1 shrink-0">
              {active.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx % active.length ? 'bg-primary w-5' : 'bg-muted-foreground/40 w-1.5'
                  }`}
                  aria-label={`Promoción ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
