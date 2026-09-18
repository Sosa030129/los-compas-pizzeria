'use client';

import { useState, useMemo } from 'react';
import { useStore, useShallow } from '@/lib/store';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, CreditCard, Banknote, Clock, MapPin, User, Phone, AlertCircle, Tag, Loader2 } from 'lucide-react';
import {
  checkOrderTime, isAnyOrderSlotOpen, nextAvailableSlotLabel, formatCUP, applyPromotions, isValidPhone, calculateCartTotals,
} from '@/lib/los-compas';
import type { PaymentMethod, TimeSlot, DeliveryMode } from '@/lib/types';
import { toast } from 'sonner';

export function CheckoutView() {
  const cart = useStore((s) => s.cart);
  const config = useStore((s) => s.config);
  const products = useStore((s) => s.products);
  const promotions = useStore((s) => s.promotions);
  const appliedPromoCode = useStore((s) => s.appliedPromoCode);
  const setView = useStore((s) => s.setView);
  const placeOrder = useStore((s) => s.placeOrder);

  const totals = useStore(useShallow((s) => calculateCartTotals(s.cart)));

  // Aplicar promociones memoizado (bug #22: evita recalcular en cada render)
  const promoResult = useMemo(
    () => applyPromotions(cart, promotions, products, appliedPromoCode),
    [cart, promotions, products, appliedPromoCode],
  );
  const totalAfterDiscount = Math.max(0, totals.total - promoResult.totalDiscount);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('domicilio');

  // Horario
  const isMorningOpen = checkOrderTime('manana', config);
  const isAfternoonOpen = checkOrderTime('tarde', config);
  const nextSlot = nextAvailableSlotLabel(config);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(nextSlot.slot);
  const scheduledTime = timeSlot === 'manana' ? config.morningDelivery : config.afternoonDelivery;

  const surcharge = paymentMethod === 'transferencia' ? totalAfterDiscount * config.transferSurcharge : 0;
  const totalFinal = totalAfterDiscount + surcharge;

  const errors: { [k: string]: string } = {};
  if (!name.trim()) errors.name = 'Tu nombre es obligatorio';
  if (!phone.trim()) errors.phone = 'Tu teléfono es obligatorio';
  else if (!isValidPhone(phone.trim())) errors.phone = 'Teléfono inválido (usa formato +53 5 1234567)';
  if (deliveryMode === 'domicilio' && !address.trim()) errors.address = 'Tu dirección es obligatoria';

  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePlace = () => {
    if (submitting) return; // Prevenir doble submit (bug #19)
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      toast.error('Revisa los campos del formulario');
      return;
    }
    if (cart.length === 0) {
      toast.error('Tu carrito está vacío');
      setView('menu');
      return;
    }

    setSubmitting(true);

    try {
      // Bug #34/#36: No mutar el carrito real con free items.
      // En su lugar, el placeOrder enviará los items del carrito + los free items
      // en el payload. El store ya incluye los items del carrito en el POST.

      const order = placeOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: deliveryMode === 'domicilio' ? address.trim() : 'Recogida en tienda',
        reference: reference.trim(),
        paymentMethod,
        timeSlot,
        deliveryMode,
        scheduledTime,
        notes: notes.trim(),
        discount: promoResult.totalDiscount,
        surcharge: paymentMethod === 'transferencia' ? surcharge : 0,
        extraItems: promoResult.freeItems, // Bug #34: free items sin mutar carrito
      });

      // Limpiar código promocional aplicado
      useStore.getState().setAppliedPromoCode(null);

      toast.success(`Pedido ${order.code} creado`);
      setView('tracking');
    } catch (e) {
      toast.error('Error al crear el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pb-24">
        <span className="text-6xl mb-4">🛒</span>
        <h2 className="font-cartoon text-lg mb-2">No tienes productos</h2>
        <button
          onClick={() => setView('menu')}
          className="bg-primary text-primary-foreground px-5 py-3 rounded-full font-bold text-sm"
        >
          Ver Menú
        </button>
      </div>
    );
  }

  return (
    <div className="animate-screen-enter pb-32">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setView('cart')}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-cartoon text-base">Checkout</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Datos del cliente */}
        <section>
          <h2 className="font-cartoon text-sm mb-2 flex items-center gap-1.5">
            <User size={16} className="text-primary" /> Tus datos
          </h2>
          <div className="space-y-2.5">
            <Field label="Nombre completo *" error={touched ? errors.name : undefined}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Carlos Pérez"
                className="bg-card border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label="Número de teléfono *" error={touched ? errors.phone : undefined}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="Ej: +53 5 1234567"
                className="bg-card border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </div>
        </section>

        {/* Modo de entrega */}
        <section>
          <h2 className="font-cartoon text-sm mb-2 flex items-center gap-1.5">
            <MapPin size={16} className="text-primary" /> Entrega
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => setDeliveryMode('domicilio')}
              className={`p-3 rounded-xl border-2 text-left transition ${
                deliveryMode === 'domicilio'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <div className="text-sm font-bold">🛵 Domicilio</div>
              <div className="text-[11px] text-muted-foreground">Llegamos a tu casa</div>
            </button>
            <button
              onClick={() => setDeliveryMode('recogida')}
              className={`p-3 rounded-xl border-2 text-left transition ${
                deliveryMode === 'recogida'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <div className="text-sm font-bold">🏪 Recogida</div>
              <div className="text-[11px] text-muted-foreground">Pasar a buscar</div>
            </button>
          </div>

          {deliveryMode === 'domicilio' && (
            <div className="space-y-2.5">
              <Field label="Dirección de entrega *" error={touched ? errors.address : undefined}>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Calle Martí #45 e/ Maceo y Agramonte"
                  className="bg-card border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                />
              </Field>
              <Field label="Referencia (opcional)">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: Casa de esquina roja, al lado del parque"
                  className="bg-card border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>
            </div>
          )}
        </section>

        {/* Horario */}
        <section>
          <h2 className="font-cartoon text-sm mb-2 flex items-center gap-1.5">
            <Clock size={16} className="text-primary" /> Horario de pedido
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => setTimeSlot('manana')}
              className={`w-full p-3 rounded-xl border-2 text-left transition ${
                timeSlot === 'manana'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">🌅 Mañana</div>
                  <div className="text-[11px] text-muted-foreground">
                    Pedidos {config.morningStart}–{config.morningEnd} · Entrega {config.morningDelivery}
                  </div>
                </div>
                <div className="text-[10px]">
                  {isMorningOpen ? (
                    <span className="bg-green-700/30 text-green-400 px-2 py-1 rounded-full font-bold">ABIERTO</span>
                  ) : (
                    <span className="bg-muted-foreground/20 text-muted-foreground px-2 py-1 rounded-full">Cerrado</span>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={() => setTimeSlot('tarde')}
              className={`w-full p-3 rounded-xl border-2 text-left transition ${
                timeSlot === 'tarde'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">🌙 Tarde-Noche</div>
                  <div className="text-[11px] text-muted-foreground">
                    Pedidos {config.afternoonStart}–{config.afternoonEnd} · Entrega {config.afternoonDelivery}
                  </div>
                </div>
                <div className="text-[10px]">
                  {isAfternoonOpen ? (
                    <span className="bg-green-700/30 text-green-400 px-2 py-1 rounded-full font-bold">ABIERTO</span>
                  ) : (
                    <span className="bg-muted-foreground/20 text-muted-foreground px-2 py-1 rounded-full">Cerrado</span>
                  )}
                </div>
              </div>
            </button>

            {!isAnyOrderSlotOpen(config) && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-[11px] text-yellow-300">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Actualmente estamos fuera del horario de pedidos. Tu pedido será programado para el próximo horario disponible ({nextSlot.slot === 'manana' ? 'mañana' : 'tarde-noche'}).
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Pago */}
        <section>
          <h2 className="font-cartoon text-sm mb-2 flex items-center gap-1.5">
            <CreditCard size={16} className="text-primary" /> Método de pago
          </h2>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setPaymentMethod('efectivo')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                paymentMethod === 'efectivo'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Banknote size={20} className={paymentMethod === 'efectivo' ? 'text-primary' : 'text-muted-foreground'} />
              <div className="flex-1">
                <div className="text-sm font-bold">💵 Efectivo</div>
                <div className="text-[11px] text-muted-foreground">Pago al recibir el pedido</div>
              </div>
              {paymentMethod === 'efectivo' && <Check size={18} className="text-primary" />}
            </button>
            <button
              onClick={() => setPaymentMethod('transferencia')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                paymentMethod === 'transferencia'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <CreditCard size={20} className={paymentMethod === 'transferencia' ? 'text-primary' : 'text-muted-foreground'} />
              <div className="flex-1">
                <div className="text-sm font-bold">💳 Transferencia</div>
                <div className="text-[11px] text-muted-foreground">
                  +{Math.round(config.transferSurcharge * 100)}% de recargo
                </div>
              </div>
              {paymentMethod === 'transferencia' && <Check size={18} className="text-primary" />}
            </button>
          </div>

          {paymentMethod === 'transferencia' && (
            <div className="mt-2 bg-primary/10 border border-primary/30 rounded-xl p-3 text-[11px] text-primary">
              Las transferencias serán aceptadas con una suma del {Math.round(config.transferSurcharge * 100)}% adicional sobre el total del pedido.
              Recargo: <strong>{formatCUP(surcharge)}</strong>
            </div>
          )}
        </section>

        {/* Notas */}
        <section>
          <h2 className="font-cartoon text-sm mb-2">Notas (opcional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Sin cebolla en la pizza, tocar timbre dos veces..."
            className="bg-card border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
          />
        </section>

        {/* Resumen */}
        <section>
          <div className="cartoon-border-primary bg-card rounded-2xl p-4">
            <h3 className="font-cartoon text-sm mb-2">Resumen del pedido</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Productos</span><span>{formatCUP(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Extras</span><span>{formatCUP(totals.extras)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Domicilio</span>
                <span>
                  {deliveryMode === 'recogida'
                    ? formatCUP(0)
                    : totals.delivery === null
                      ? 'Pendiente'
                      : formatCUP(totals.delivery)}
                </span>
              </div>

              {/* Promociones aplicadas */}
              {promoResult.results.length > 0 && (
                <div className="border-t border-border pt-1.5 mt-1.5 space-y-1">
                  {promoResult.results.map((r, i) => (
                    <div key={i} className="flex justify-between text-green-400">
                      <span className="flex items-center gap-1 text-xs">
                        <Tag size={11} /> {r.promotion.emoji} {r.promotion.name}
                      </span>
                      <span className="text-xs font-bold">
                        {r.discount > 0 ? `-${formatCUP(r.discount)}` : 'GRATIS'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {promoResult.totalDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal con descuento</span>
                  <span>{formatCUP(totalAfterDiscount)}</span>
                </div>
              )}
              {surcharge > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Recargo transferencia</span>
                  <span>{formatCUP(surcharge)}</span>
                </div>
              )}
              <div className="flex justify-between font-cartoon text-base text-primary border-t border-border pt-2 mt-2">
                <span>Total</span>
                <span>{formatCUP(totalFinal)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="fixed bottom-16 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t-2 border-primary/30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground">
              {cart.length} producto(s) · {deliveryMode === 'domicilio' ? 'Domicilio' : 'Recogida'} · {paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}
            </p>
            <p className="font-cartoon text-base text-primary">{formatCUP(totalFinal)}</p>
          </div>
          <button
            onClick={handlePlace}
            disabled={submitting}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold text-sm hover:opacity-95 animate-button-pop disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Creando...
              </>
            ) : (
              'Confirmar pedido'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted-foreground mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
