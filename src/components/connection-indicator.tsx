'use client';

import { useSyncExternalStore } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// useSyncExternalStore: patrón correcto para suscripción a eventos del navegador
function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // asumir online en SSR
}

export function ConnectionIndicator() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <>
      {/* Indicador persistente en esquina */}
      <div className="fixed bottom-20 right-3 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            online
              ? 'bg-green-700/20 text-green-400 border-green-700/40'
              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
          }`}
        >
          {online ? <Wifi size={11} /> : <WifiOff size={11} />}
          <span>{online ? 'Online' : 'Offline'}</span>
        </motion.div>
      </div>

      {/* Banner cuando está offline */}
      <AnimatePresence>
        {!online && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 inset-x-0 z-50 bg-yellow-500 text-black text-center py-2 text-xs font-bold"
          >
            ⚠️ Sin conexión. Puedes seguir navegando pero los pedidos no se sincronizarán hasta volver online.
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
