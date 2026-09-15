'use client';

import { useStore } from '@/lib/store';
import { useEffect } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { HomeView } from '@/components/views/home-view';
import { MenuView } from '@/components/views/menu-view';
import { BuilderView } from '@/components/views/builder-view';
import { CartView } from '@/components/views/cart-view';
import { CheckoutView } from '@/components/views/checkout-view';
import { TrackingView } from '@/components/views/tracking-view';
import { LoginView } from '@/components/views/login-view';
import { AdminView } from '@/components/views/admin-view';
import { KitchenView } from '@/components/views/kitchen-view';
import { DeliveryView } from '@/components/views/delivery-view';

export default function Home() {
  const view = useStore((s) => s.currentView);
  const setView = useStore((s) => s.setView);

  // Soporte para deep-links PWA via ?view=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view') as typeof view | null;
    if (v && ['home', 'menu', 'builder', 'cart', 'checkout', 'tracking', 'admin', 'kitchen', 'delivery', 'login'].includes(v)) {
      setView(v);
    }
  }, [setView]);

  return (
    <main id="main-scroll" className="min-h-screen flex flex-col bg-paper-texture">
      <div className="flex-1">
        {view === 'home' && <HomeView />}
        {view === 'menu' && <MenuView />}
        {view === 'builder' && <BuilderView />}
        {view === 'cart' && <CartView />}
        {view === 'checkout' && <CheckoutView />}
        {view === 'tracking' && <TrackingView />}
        {view === 'login' && <LoginView />}
        {view === 'admin' && <AdminView />}
        {view === 'kitchen' && <KitchenView />}
        {view === 'delivery' && <DeliveryView />}
      </div>
      <BottomNav />
    </main>
  );
}
