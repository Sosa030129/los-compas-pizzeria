'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed';

/**
 * FASE 3.6: Hook para gestionar suscripción Web Push desde el cliente.
 *
 * Flujo:
 * 1. Verifica si el navegador soporta Service Worker + Push
 * 2. Si el usuario tiene sesión de customer activa, verifica si ya está suscrito
 * 3. Exposición: pushState, subscribe(), unsubscribe()
 *
 * Gratuito: usa el Service Worker ya registrado en /sw.js + Web Push API nativa
 * del navegador. No usa servicios externos.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>('default');
  const [loading, setLoading] = useState(false);
  const currentEmployee = useStore((s) => s.currentEmployee);
  const lastCustomerPhone = useStore((s) => s.lastCustomerPhone);

  // Verifica soporte + estado actual del permiso
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    // No ofrecer push a empleados (ellos reciben WhatsApp)
    if (currentEmployee) {
      setState('default');
      return;
    }
    if (Notification.permission === 'granted') {
      // Verificar si ya hay suscripción activa
      (async () => {
        try {
          const reg = await navigator.serviceWorker.ready;
          const existing = await reg.pushManager.getSubscription();
          setState(existing ? 'subscribed' : 'granted');
        } catch {
          setState('granted');
        }
      })();
    } else {
      setState(Notification.permission as PushState);
    }
  }, [currentEmployee, lastCustomerPhone]);

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    setLoading(true);
    try {
      // 1. Pedir permiso de notificaciones
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        toast.error('Permiso de notificaciones denegado');
        return false;
      }

      // 2. Fetch VAPID public key desde el backend
      const res = await fetch('/api/push/vapid');
      const data = await res.json();
      if (!data.ok || !data.publicKey) {
        toast.error('Push notifications no configuradas en el servidor');
        return false;
      }

      // 3. Convertir VAPID key a ArrayBuffer (formato que requiere PushManager)
      const publicKeyBytes = urlBase64ToArrayBuffer(data.publicKey);

      // 4. Suscribirse vía Service Worker
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true, // obligatorio: notificaciones visibles
        applicationServerKey: publicKeyBytes,
      });

      // 5. Enviar suscripción al backend para guardarla en Customer.pushSubscription
      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const subData = await subRes.json();
      if (!subData.ok) {
        toast.error('Error al guardar suscripción: ' + (subData.error || ''));
        return false;
      }

      setState('subscribed');
      toast.success('🔔 Notificaciones activadas');
      return true;
    } catch (e: any) {
      console.error('[usePush] subscribe error:', e);
      toast.error('Error al activar notificaciones: ' + (e?.message || ''));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      // Opcional: avisar al backend para limpiar pushSubscription del customer
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
      }).catch(() => {});
      setState('granted');
      toast.success('Notificaciones desactivadas');
      return true;
    } catch (e: any) {
      console.error('[usePush] unsubscribe error:', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, subscribe, unsubscribe };
}

// Helper: convertir VAPID public key (base64url) a ArrayBuffer
// Requerido por PushManager.subscribe(applicationServerKey) - BufferSource
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}
