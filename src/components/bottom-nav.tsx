'use client';

import { useStore, useShallow } from '@/lib/store';
import type { View } from '@/lib/types';
import { motion } from 'framer-motion';
import { Home, Pizza, ShoppingCart, ClipboardList, User } from 'lucide-react';

const items: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'home', label: 'Inicio', icon: Home },
  { view: 'menu', label: 'Menú', icon: Pizza },
  { view: 'cart', label: 'Carrito', icon: ShoppingCart },
  { view: 'tracking', label: 'Pedidos', icon: ClipboardList },
  { view: 'login', label: 'Cuenta', icon: User },
];

export function BottomNav() {
  const view = useStore((s) => s.currentView);
  const setView = useStore((s) => s.setView);
  const cartCount = useStore((s) =>
    s.cart.reduce((n, c) => n + c.qty, 0)
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t-2 border-primary/30 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                setView(item.view);
                document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="relative flex flex-col items-center justify-center py-2.5 gap-0.5"
              aria-label={item.label}
            >
              <span
                className={`relative inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'
                }`}
              >
                <Icon size={22} strokeWidth={2.2} />
                {item.view === 'cart' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-foreground text-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-card">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="nav-dot"
                    className="absolute -bottom-1.5 h-1 w-6 rounded-full bg-primary"
                  />
                )}
              </span>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
