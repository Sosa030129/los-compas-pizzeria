'use client';

import { useStore } from '@/lib/store';
import { useEffect, lazy, Suspense } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { ConnectionIndicator } from '@/components/connection-indicator';
import { HomeView } from '@/components/views/home-view';
import { MenuView } from '@/components/views/menu-view';
import { BuilderView } from '@/components/views/builder-view';
import { CartView } from '@/components/views/cart-view';
import { CheckoutView } from '@/components/views/checkout-view';
import { TrackingView } from '@/components/views/tracking-view';
import { LoginView } from '@/components/views/login-view';

// Lazy load de los paneles privados (solo se cargan cuando se necesita login)
const AdminView = lazy(() => import('@/components/views/admin-view').then(m => ({ default: m.AdminView })));
const KitchenView = lazy(() => import('@/components/views/kitchen-view').then(m => ({ default: m.KitchenView })));
const DeliveryView = lazy(() => import('@/components/views/delivery-view').then(m => ({ default: m.DeliveryView })));

function ViewLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin-slow text-5xl">🍕</div>
    </div>
  );
}

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
      <ConnectionIndicator />
      <div className="flex-1">
        {view === 'home' && <HomeView />}
        {view === 'menu' && <MenuView />}
        {view === 'builder' && <BuilderView />}
        {view === 'cart' && <CartView />}
        {view === 'checkout' && <CheckoutView />}
        {view === 'tracking' && <TrackingView />}
        {view === 'login' && <LoginView />}
        {view === 'admin' && (
          <Suspense fallback={<ViewLoader />}>
            <AdminView />
          </Suspense>
        )}
        {view === 'kitchen' && (
          <Suspense fallback={<ViewLoader />}>
            <KitchenView />
          </Suspense>
        )}
        {view === 'delivery' && (
          <Suspense fallback={<ViewLoader />}>
            <DeliveryView />
          </Suspense>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
