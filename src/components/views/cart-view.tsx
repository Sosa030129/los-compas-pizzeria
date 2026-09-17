'use client';

import { useStore, useShallow } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingBag, ChevronLeft, ArrowRight, Tag, X, Pencil } from 'lucide-react';
import {
  formatCUP, ingredientQtyLabel, ingredientQtyMultiplier, applyPromotions, findPromotionByCode, calculateCartTotals,
} from '@/lib/los-compas';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { CartItem, CartItemIngredient, IngredientQty } from '@/lib/types';

const QTY_OPTIONS: IngredientQty[] = ['normal', 'doble', 'triple'];
// Ya no usamos BASE_INCLUDED global: cada pizza tiene sus defaultIngredients como incluidos

export function CartView() {
  const cart = useStore((s) => s.cart);
  const ingredients = useStore((s) => s.ingredients);
  const sizes = useStore((s) => s.sizes);
  const products = useStore((s) => s.products);
  const promotions = useStore((s) => s.promotions);
  const appliedPromoCode = useStore((s) => s.appliedPromoCode);
  const setAppliedPromoCode = useStore((s) => s.setAppliedPromoCode);
  const updateCartItem = useStore((s) => s.updateCartItem);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const clearCart = useStore((s) => s.clearCart);
  const setView = useStore((s) => s.setView);
  const config = useStore((s) => s.config);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [editItem, setEditItem] = useState<CartItem | null>(null);
  const [editIngs, setEditIngs] = useState<CartItemIngredient[]>([]);

  const totals = useStore(useShallow((s) => calculateCartTotals(s.cart)));

  // Memoizar cálculo de promociones (bug #22)
  const promoResult = useMemo(
    () => applyPromotions(cart, promotions, products, appliedPromoCode),
    [cart, promotions, products, appliedPromoCode],
  );
  const finalTotal = Math.max(0, totals.total - promoResult.totalDiscount);

  if (cart.length === 0) {
    return (
      <div className="animate-screen-enter min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pb-24">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-7xl mb-4"
        >
          🛒
        </motion.div>
        <h2 className="font-cartoon text-xl mb-2">Tu carrito está vacío</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-5">
          Explora nuestro menú o arma tu pizza personalizada para comenzar tu pedido.
        </p>
        <button
          onClick={() => setView('menu')}
          className="bg-primary text-primary-foreground px-5 py-3 rounded-full font-bold text-sm hover:opacity-95 animate-button-pop"
        >
          Ver Menú
        </button>
      </div>
    );
  }

  return (
    <div className="animate-screen-enter pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setView('menu')}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-cartoon text-base flex-1">Carrito ({cart.length})</h1>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-destructive font-bold hover:underline"
          >
            Vaciar
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {cart.map((item) => {
          const size = item.size ? sizes.find((s) => s.id === item.size) : null;
          const ings = (item.ingredients || [])
            .map((ci) => {
              const ing = ingredients.find((i) => i.id === ci.ingredientId);
              if (!ing) return null;
              return `${ing.name}${ci.qty !== 'normal' ? ` (${ingredientQtyLabel(ci.qty)})` : ''}`;
            })
            .filter(Boolean) as string[];

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="cartoon-border bg-card rounded-2xl p-3"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-cartoon text-sm leading-tight">{item.name}</h3>
                    <div className="flex gap-1 shrink-0">
                      {item.size && (
                        <button
                          onClick={() => {
                            setEditItem(item);
                            setEditIngs(item.ingredients ? [...item.ingredients] : []);
                          }}
                          className="text-primary hover:bg-primary/10 w-7 h-7 rounded-full flex items-center justify-center"
                          aria-label="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          removeFromCart(item.id);
                          toast(`Eliminado: ${item.name}`);
                        }}
                        className="text-destructive hover:bg-destructive/10 w-7 h-7 rounded-full flex items-center justify-center"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {size && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {size.label}{item.borderCheese ? ' · Borde queso' : ''}
                    </p>
                  )}
                  {ings.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      Extras: {ings.join(', ')}
                    </p>
                  )}
                  {item.notes && !size && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.notes}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
                      <button
                        onClick={() => {
                          if (item.qty === 1) {
                            removeFromCart(item.id);
                          } else {
                            updateCartItem(item.id, { qty: item.qty - 1 });
                          }
                        }}
                        className="w-7 h-7 rounded-full bg-card flex items-center justify-center hover:bg-background"
                        aria-label="Disminuir"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold min-w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateCartItem(item.id, { qty: item.qty + 1 })}
                        className="w-7 h-7 rounded-full bg-card flex items-center justify-center hover:bg-background"
                        aria-label="Aumentar"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="text-right">
                      {item.extrasTotal > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Base: {formatCUP(item.unitPrice * item.qty)} · Extras: {formatCUP(item.extrasTotal * item.qty)}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary">
                        {item.unitPrice === 0 && item.extrasTotal === 0 ? (
                          <span className="bg-green-700/30 text-green-400 px-2 py-0.5 rounded-full text-[10px]">
                            GRATIS
                          </span>
                        ) : (
                          formatCUP((item.unitPrice + item.extrasTotal) * item.qty)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="cartoon-border-primary bg-card rounded-2xl p-4">
          <h3 className="font-cartoon text-sm mb-2">Resumen</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Productos</span>
              <span>{formatCUP(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Extras</span>
              <span>{formatCUP(totals.extras)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground border-t border-border pt-1.5">
              <span>Domicilio</span>
              <span>
                {totals.delivery === null
                  ? 'Pendiente de confirmar'
                  : formatCUP(totals.delivery)}
              </span>
            </div>
            {totals.delivery === null && (
              <p className="text-[11px] text-muted-foreground">
                💡 El costo final de domicilio será confirmado por el administrador.
                Costo base sugerido: {formatCUP(config.deliveryBase)}
              </p>
            )}

            {/* Promociones aplicadas */}
            {promoResult.results.length > 0 && (
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                {promoResult.results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between text-green-400"
                  >
                    <span className="flex items-center gap-1 text-xs">
                      <Tag size={11} /> {r.promotion.emoji} {r.promotion.name}
                    </span>
                    <span className="text-xs font-bold">
                      {r.discount > 0 ? `-${formatCUP(r.discount)}` : 'GRATIS'}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex justify-between font-cartoon text-base text-primary border-t border-border pt-2 mt-2">
              <span>Total</span>
              <span>
                {promoResult.totalDiscount > 0 ? (
                  <span className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground text-xs">
                      {formatCUP(totals.total)}
                    </span>
                    {formatCUP(finalTotal)}
                  </span>
                ) : (
                  formatCUP(totals.total)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Código promocional */}
        <div className="mt-3">
          {showCodeInput ? (
            <div className="cartoon-border bg-card rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-primary" />
                <h4 className="text-xs font-bold">¿Tienes un código promocional?</h4>
              </div>
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="PROMO15"
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm uppercase placeholder:normal-case"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && promoInput.trim()) {
                      const p = findPromotionByCode(promotions, promoInput);
                      if (p) {
                        setAppliedPromoCode(promoInput.trim().toUpperCase());
                        toast.success(`Código ${promoInput.trim().toUpperCase()} aplicado: ${p.name}`);
                        setShowCodeInput(false);
                        setPromoInput('');
                      } else {
                        toast.error('Código inválido o expirado');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!promoInput.trim()) return;
                    const p = findPromotionByCode(promotions, promoInput);
                    if (p) {
                      setAppliedPromoCode(promoInput.trim().toUpperCase());
                      toast.success(`Código ${promoInput.trim().toUpperCase()} aplicado: ${p.name}`);
                      setShowCodeInput(false);
                      setPromoInput('');
                    } else {
                      toast.error('Código inválido o expirado');
                    }
                  }}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-bold"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => { setShowCodeInput(false); setPromoInput(''); }}
                  className="bg-secondary px-2 py-2 rounded-xl"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : appliedPromoCode ? (
            <div className="cartoon-border bg-primary/10 border-primary/30 rounded-2xl p-3 flex items-center gap-2">
              <Tag size={14} className="text-primary" />
              <span className="text-xs flex-1">
                Código <strong className="text-primary">{appliedPromoCode}</strong> aplicado
              </span>
              <button
                onClick={() => {
                  setAppliedPromoCode(null);
                  toast('Código removido');
                }}
                className="text-destructive hover:underline text-xs"
              >
                <X size={14} className="inline" /> Quitar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCodeInput(true)}
              className="w-full text-xs text-primary font-bold py-2 hover:underline"
            >
              + Aplicar código promocional
            </button>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-16 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t-2 border-primary/30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground">
              {promoResult.totalDiscount > 0
                ? `Ahorras ${formatCUP(promoResult.totalDiscount)} 🎉`
                : 'Total provisional'}
            </p>
            <p className="font-cartoon text-base text-primary">{formatCUP(finalTotal)}</p>
          </div>
          <button
            onClick={() => setView('checkout')}
            className="bg-primary text-primary-foreground px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-95 animate-button-pop"
          >
            Continuar <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Confirmar vaciar */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowClearConfirm(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-5 w-full max-w-sm border-2 border-border"
            >
              <h3 className="font-cartoon text-base mb-2">¿Vaciar carrito?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Se eliminarán todos los productos que agregaste.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-secondary text-secondary-foreground py-2.5 rounded-full font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    setShowClearConfirm(false);
                    toast.success('Carrito vaciado');
                  }}
                  className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-full font-bold text-sm"
                >
                  Vaciar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de editar ingredientes */}
      <AnimatePresence>
        {editItem && editItem.size && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditItem(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{editItem.emoji}</span>
                  <div>
                    <h3 className="font-cartoon text-base">Editar {editItem.name}</h3>
                    <p className="text-xs text-muted-foreground">{sizes.find((s) => s.id === editItem.size)?.label}</p>
                  </div>
                </div>
                <button onClick={() => setEditItem(null)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X size={16} /></button>
              </div>

              <p className="text-xs font-bold text-muted-foreground mb-2">Ingredientes (agrega o quita):</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto mb-3">
                {ingredients.filter((i) => i.available).map((ing) => {
                  const ci = editIngs.find((s) => s.ingredientId === ing.id);
                  const qty = ci?.qty;
                  const price = ing.priceBySize[editItem.size!] || 0;
                  const mult = qty ? ingredientQtyMultiplier(qty) : 0;
                  const editDefaults = (() => {
                    const s = new Set<string>();
                    if (editItem.productId) {
                      const p = products.find((pr) => pr.id === editItem.productId);
                      p?.defaultIngredients?.forEach((id) => s.add(id));
                    }
                    return s;
                  })();
                  const freePortions = editDefaults.has(ing.id) ? 1 : 0;
                  const charge = Math.max(0, mult - freePortions) * price;
                  return (
                    <div key={ing.id} className={`flex items-center gap-2 p-2 rounded-lg border ${qty ? 'border-primary bg-primary/10' : 'border-border'}`}>
                      <span className="text-xl">{ing.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold leading-tight">{ing.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {charge > 0 ? `+${charge.toLocaleString('es-CU')} CUP` : (qty ? 'Incluido' : `+${price.toLocaleString('es-CU')} CUP`)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {qty ? (
                          <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
                            {QTY_OPTIONS.map((q) => (
                              <button key={q} onClick={() => {
                                if (q === qty) setEditIngs((prev) => prev.filter((p) => p.ingredientId !== ing.id));
                                else setEditIngs((prev) => {
                                  const ex = prev.find((p) => p.ingredientId === ing.id);
                                  if (ex) return prev.map((p) => p.ingredientId === ing.id ? { ...p, qty: q } : p);
                                  return [...prev, { ingredientId: ing.id, qty: q }];
                                });
                              }} className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${qty === q ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                                {q === 'normal' ? 'N' : q === 'doble' ? 'D' : 'T'}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => setEditIngs((prev) => [...prev, { ingredientId: ing.id, qty: 'normal' }])}
                            className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center animate-button-pop">
                            <Plus size={14} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const editDefaults = (() => {
                  const s = new Set<string>();
                  if (editItem.productId) {
                    const p = products.find((pr) => pr.id === editItem.productId);
                    p?.defaultIngredients?.forEach((id) => s.add(id));
                  }
                  return s;
                })();
                const newExtras = editIngs.reduce((sum, ci) => {
                  const ing = ingredients.find((i) => i.id === ci.ingredientId);
                  if (!ing) return sum;
                  const price = ing.priceBySize[editItem.size!] || 0;
                  const mult = ingredientQtyMultiplier(ci.qty);
                  const freePortions = editDefaults.has(ci.ingredientId) ? 1 : 0;
                  return sum + price * Math.max(0, mult - freePortions);
                }, 0);
                const newTotal = editItem.unitPrice + newExtras;
                return (
                  <>
                    <div className="bg-secondary/40 rounded-xl p-2 mb-3 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Nuevo total</span>
                      <span className="font-cartoon text-base text-primary">{formatCUP(newTotal)}</span>
                    </div>
                    <button onClick={() => {
                      updateCartItem(editItem.id, { ingredients: editIngs, extrasTotal: newExtras });
                      toast.success('Cambios guardados');
                      setEditItem(null);
                    }} className="w-full bg-primary text-primary-foreground py-3 rounded-full font-bold text-sm hover:opacity-95 animate-button-pop">
                      Guardar cambios
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
