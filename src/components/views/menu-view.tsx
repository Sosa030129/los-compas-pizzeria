'use client';

import { useStore } from '@/lib/store';
import { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Minus, Check, Heart } from 'lucide-react';
import { uid, ingredientQtyMultiplier, formatCUP, getIngredientPrice } from '@/lib/los-compas';
import type { CartItem, CartItemIngredient, IngredientQty, PizzaSize, Product } from '@/lib/types';
import { toast } from 'sonner';

const QTY_OPTIONS: IngredientQty[] = ['normal', 'doble', 'triple'];
// Ya no usamos BASE_INCLUDED global: cada pizza tiene sus defaultIngredients como incluidos

export function MenuView() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const sizes = useStore((s) => s.sizes);
  const ingredients = useStore((s) => s.ingredients);
  const offers = useStore((s) => s.offers);
  const addToCart = useStore((s) => s.addToCart);
  const setView = useStore((s) => s.setView);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [quickAdd, setQuickAdd] = useState<Product | null>(null);
  const [openOffer, setOpenOffer] = useState<any | null>(null); // FASE H: oferta abierta
  const [step, setStep] = useState<'size' | 'ingredients'>('size');
  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(null);
  const [selectedIngs, setSelectedIngs] = useState<CartItemIngredient[]>([]);
  const [borderCheese, setBorderCheese] = useState(false);
  // Defaults iniciales al abrir el modal (para detectar modificaciones y calcular free portions)
  const [initialDefaults, setInitialDefaults] = useState<CartItemIngredient[]>([]);
  const scrollRef = useRef(0);

  // FASE H: IDs de ingredientes OBLIGATORIOS de la oferta abierta (no eliminables)
  const lockedIngredientIds = useMemo(
    () => new Set<string>((openOffer?.includedIngredients || []).map((id: string) => id)),
    [openOffer],
  );

  // IDs de ingredientes que son predeterminados de la pizza actual (→ 1 porción gratis)
  const defaultIngredientIds = useMemo(
    () => new Set(initialDefaults.map((ci) => ci.ingredientId)),
    [initialDefaults],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, activeCat, query]);

  const cats = categories.filter((c) => c.visible).sort((a, b) => a.order - b.order);
  const minPizzaPrice = useMemo(() => sizes.length > 0 ? Math.min(...sizes.map((s) => s.basePrice)) : 0, [sizes]);

  const handleQuickAdd = (p: Product) => {
    if (p.isPizza) {
      scrollRef.current = window.scrollY;
      setQuickAdd(p);
      setStep('size');
      setSelectedSize(null);
      setBorderCheese(false);
      const defs = p.defaultIngredients?.map((ingId) => ({ ingredientId: ingId, qty: 'normal' as const })) || [];
      setSelectedIngs(defs);
      setInitialDefaults(defs);
    } else {
      addToCart({ id: uid('cart'), productId: p.id, name: p.name, emoji: p.emoji, unitPrice: p.price, qty: 1, extrasTotal: 0 });
      toast.success(`${p.name} agregado al carrito`);
    }
  };

  const setIngQty = (ingredientId: string, qty: IngredientQty | null) => {
    setSelectedIngs((prev) => {
      if (qty === null) return prev.filter((p) => p.ingredientId !== ingredientId);
      const exists = prev.find((p) => p.ingredientId === ingredientId);
      if (exists) return prev.map((p) => (p.ingredientId === ingredientId ? { ...p, qty } : p));
      return [...prev, { ingredientId, qty }];
    });
  };

  // extras: cada porción de ingrediente se cobra completa (sin porción gratis)
  const extras = selectedIngs.reduce((sum, ci) => {
    const ing = ingredients.find((i) => i.id === ci.ingredientId);
    if (!ing || !selectedSize) return sum;
    const price = getIngredientPrice(ing, selectedSize);
    const mult = ingredientQtyMultiplier(ci.qty);
    return sum + price * mult;
  }, 0);

  const currentSize = selectedSize ? sizes.find((s) => s.id === selectedSize) : null;
  const borderPrice = currentSize?.borderDelta ?? 0;
  const total = (currentSize?.basePrice || 0) + (borderCheese ? borderPrice : 0) + extras;

  const confirmAdd = () => {
    if (!quickAdd || !selectedSize) return;
    const size = sizes.find((s) => s.id === selectedSize)!;
    const unitPrice = size.basePrice + (borderCheese ? (size.borderDelta ?? 0) : 0);
    addToCart({
      id: uid('cart'), productId: quickAdd.id, name: quickAdd.name, emoji: quickAdd.emoji,
      unitPrice, qty: 1, size: size.id, borderCheese, extrasTotal: extras, ingredients: selectedIngs,
    });
    toast.success(`${quickAdd.name} (${size.label}${borderCheese ? ' · Borde queso' : ''}) agregada`);
    closeAndReset();
  };

  // Cierra el modal y restaura scroll. Cuando el usuario ya eligió tamaño (paso
  // ingredientes), siempre envía la pizza al carrito con los ingredientes actuales
  // (defaults + agregados extra). El precio final = base + borde + extras.
  const closeModal = () => {
    if (quickAdd && selectedSize && step === 'ingredients') {
      const size = sizes.find((s) => s.id === selectedSize)!;
      const unitPrice = size.basePrice + (borderCheese ? (size.borderDelta ?? 0) : 0);
      addToCart({
        id: uid('cart'), productId: quickAdd.id, name: quickAdd.name, emoji: quickAdd.emoji,
        unitPrice, qty: 1, size: size.id, borderCheese, extrasTotal: extras, ingredients: selectedIngs,
      });
      toast.success(`${quickAdd.name} (${size.label}${borderCheese ? ' · Borde queso' : ''}) · ${formatCUP(unitPrice + extras)}`);
    }
    closeAndReset();
  };

  const closeAndReset = () => {
    setQuickAdd(null);
    setStep('size');
    setBorderCheese(false);
    setInitialDefaults([]);
    setTimeout(() => window.scrollTo(0, scrollRef.current), 100);
  };

  return (
    <div className="animate-screen-enter pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="relative max-w-3xl mx-auto">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..."
            className="w-full bg-card border border-border rounded-full pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={16} /></button>}
        </div>
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1 -mx-4 px-4 max-w-3xl mx-auto">
          <CategoryChip active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="Todos" emoji="🍽️" />
          {cats.map((c) => <CategoryChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} label={c.name} emoji={c.emoji} />)}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* FASE H: Sección de Ofertas publicadas */}
        {offers.length > 0 && !query && (activeCat === 'all' || activeCat === 'pizzas') && (
          <section className="mb-7">
            <h2 className="font-cartoon text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">✨</span> Ofertas
              <span className="text-xs text-muted-foreground font-normal ml-1">({offers.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {offers.map((o: any) => {
                const product = products.find((p) => p.id === o.productId);
                if (!product) return null;
                const minPrice = sizes.length > 0 ? Math.min(...sizes.map((s) => s.basePrice)) : 0;
                return (
                  <motion.div key={o.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="cartoon-border bg-card rounded-2xl p-3 flex flex-col border-primary/40">
                    <div className="aspect-square flex items-center justify-center mb-2 relative">
                      <span className="text-5xl animate-spin-slow">{o.emoji || product.emoji}</span>
                      <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        OFERTA
                      </span>
                    </div>
                    <h3 className="font-cartoon text-sm leading-tight">{o.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 min-h-[28px]">{o.description || product.description}</p>
                    <p className="text-[10px] text-primary mt-1">
                      🔒 {o.includedIngredients?.length || 0} ingredientes obligatorios
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Desde {minPrice.toLocaleString('es-CU')} CUP</span>
                      <button
                        onClick={() => {
                          scrollRef.current = window.scrollY;
                          setOpenOffer(o);
                          setStep('size');
                          setSelectedSize(null);
                          setBorderCheese(false);
                          // Pre-cargar includedIngredients como defaults (NO eliminables)
                          const defs = (o.includedIngredients || []).map((ingId: string) => ({ ingredientId: ingId, qty: 'normal' as const }));
                          setSelectedIngs(defs);
                          setInitialDefaults(defs);
                        }}
                        className="bg-primary text-primary-foreground w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 animate-button-pop"
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

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
                {items.map((p, i) => {
                  const isFav = favorites.includes(p.id);
                  return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    className={`cartoon-border bg-card rounded-2xl p-3 flex flex-col ${!p.available ? 'opacity-60' : ''}`}>
                    <div className="aspect-square flex items-center justify-center mb-2 relative">
                      <span className={`text-5xl ${p.isPizza ? 'animate-spin-slow' : ''}`}>{p.emoji}</span>
                      {/* FASE 3.4: Botón favorito */}
                      <button
                        onClick={() => toggleFavorite(p.id)}
                        className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center transition ${isFav ? 'bg-primary/20 text-primary' : 'bg-secondary/40 text-muted-foreground hover:text-primary'}`}
                        aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        <Heart size={13} fill={isFav ? 'currentColor' : 'none'} strokeWidth={3} />
                      </button>
                    </div>
                    <h3 className="font-cartoon text-sm leading-tight">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 min-h-[28px]">{p.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        {p.isPizza ? 'Desde ' : ''}{(p.isPizza ? minPizzaPrice : p.price).toLocaleString('es-CU')} CUP
                      </span>
                      {p.available ? (
                        <button onClick={() => handleQuickAdd(p)} className="bg-primary text-primary-foreground w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 animate-button-pop">
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      ) : (
                        <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-1 rounded-full font-bold">Agotado</span>
                      )}
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-sm">No encontramos productos para "{query}"</p>
            <button onClick={() => { setQuery(''); setActiveCat('all'); }} className="mt-3 text-xs text-primary font-bold hover:underline">Limpiar filtros</button>
          </div>
        )}
      </div>

      {/* Modal: Paso 1 = Tamaño, Paso 2 = Ingredientes */}
      <AnimatePresence>
        {quickAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 24 }} onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-border max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{quickAdd.emoji}</span>
                  <div>
                    <h3 className="font-cartoon text-base">{quickAdd.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{quickAdd.description}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X size={16} /></button>
              </div>

              {/* Paso 1: Tamaño */}
              {step === 'size' && (
                <>
                  <p className="text-xs font-bold text-muted-foreground mb-2">Elige el tamaño:</p>
                  <div className="grid grid-cols-1 gap-1.5 mb-4">
                    {sizes.map((s) => {
                      const borderPrice = (s.borderDelta ?? 0) + s.basePrice;
                      return (
                        <button key={s.id} onClick={() => { setSelectedSize(s.id); setStep('ingredients'); }}
                          className="flex items-center justify-between bg-secondary/60 hover:bg-secondary transition rounded-xl px-3 py-2.5 text-left">
                          <span className="text-sm font-medium">{s.label}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">{s.basePrice.toLocaleString('es-CU')} CUP</span>
                            {s.borderDelta ? (
                              <span className="text-[10px] text-muted-foreground">| Borde {borderPrice.toLocaleString('es-CU')}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Paso 2: Ingredientes */}
              {step === 'ingredients' && currentSize && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setStep('size')} className="text-xs text-primary font-bold">← Cambiar tamaño</button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-bold text-primary">{currentSize.label}</span>
                  </div>

                  {/* Toggle Borde de queso */}
                  {borderPrice > 0 && (
                    <button
                      onClick={() => setBorderCheese((v) => !v)}
                      className={`w-full p-2.5 rounded-xl border-2 flex items-center justify-between transition mb-3 ${borderCheese ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold">🧀 Borde de queso</p>
                        <p className="text-[10px] text-muted-foreground">+{borderPrice.toLocaleString('es-CU')} CUP</p>
                      </div>
                      <span className={`w-10 h-6 rounded-full transition-colors flex items-center ${borderCheese ? 'bg-primary' : 'bg-muted-foreground'}`}>
                        <span className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${borderCheese ? 'translate-x-4' : ''}`} />
                      </span>
                    </button>
                  )}

                  <p className="text-xs font-bold text-muted-foreground mb-2">Ingredientes (agrega o quita):</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto mb-3">
                    {ingredients.filter((i) => i.available).map((ing) => {
                      const ci = selectedIngs.find((s) => s.ingredientId === ing.id);
                      const qty = ci?.qty;
                      const price = getIngredientPrice(ing, selectedSize);
                      const mult = qty ? ingredientQtyMultiplier(qty) : 0;
                      const charge = mult * price;
                      return (
                        <div key={ing.id} className={`flex items-center gap-2 p-2 rounded-lg border ${qty ? 'border-primary bg-primary/10' : 'border-border'}`}>
                          <span className="text-xl">{ing.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold leading-tight">{ing.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {charge > 0 ? `+${charge.toLocaleString('es-CU')} CUP` : `+${price.toLocaleString('es-CU')} CUP`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {qty ? (
                              <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
                                {QTY_OPTIONS.map((q) => (
                                  <button key={q} onClick={() => { if (q === qty) setIngQty(ing.id, null); else setIngQty(ing.id, q); }}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${qty === q ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                                    {q === 'normal' ? 'N' : q === 'doble' ? 'D' : 'T'}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button onClick={() => setIngQty(ing.id, 'normal')} className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center animate-button-pop">
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-2 mb-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="font-cartoon text-base text-primary">{formatCUP(total)}</span>
                  </div>

                  <button onClick={confirmAdd} className="w-full bg-primary text-primary-foreground py-3 rounded-full font-bold text-sm hover:opacity-95 animate-button-pop">
                    Enviar al carrito · {formatCUP(total)}
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    También puedes cerrar esta ventana para enviarla al carrito
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FASE H: Modal de oferta abierta (similar a quickAdd pero con ingredientes locked) */}
      <AnimatePresence>
        {openOffer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => {
            // Click fuera del modal = mismo comportamiento que X: si ya eligió tamaño, agregar al carrito
            if (openOffer && selectedSize && step === 'ingredients') {
              const size = sizes.find((s) => s.id === selectedSize)!;
              const unitPrice = size.basePrice + (borderCheese ? (size.borderDelta ?? 0) : 0);
              const withDiscount = openOffer.discountPercent > 0
                ? Math.round((unitPrice + extras) * (1 - openOffer.discountPercent / 100))
                : unitPrice + extras;
              addToCart({
                id: uid('cart'),
                productId: openOffer.productId,
                name: openOffer.name,
                emoji: openOffer.emoji,
                unitPrice, qty: 1, size: size.id, borderCheese,
                extrasTotal: extras,
                ingredients: selectedIngs,
                notes: `Oferta: ${openOffer.name}${openOffer.discountPercent > 0 ? ` (-${openOffer.discountPercent}%)` : ''}`,
              });
              toast.success(`${openOffer.name} agregada · ${formatCUP(withDiscount)}`);
            }
            setOpenOffer(null);
            setStep('size');
            setInitialDefaults([]);
            setTimeout(() => window.scrollTo(0, scrollRef.current), 100);
          }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 24 }} onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-5 w-full max-w-md border-2 border-primary/40 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{openOffer.emoji}</span>
                  <div>
                    <h3 className="font-cartoon text-base">{openOffer.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{openOffer.description}</p>
                  </div>
                </div>
                <button onClick={() => {
                  // FASE: mismo comportamiento que pizza normal — si ya eligió tamaño,
                  // cerrar con X envía la oferta al carrito con los ingredientes actuales
                  if (openOffer && selectedSize && step === 'ingredients') {
                    const size = sizes.find((s) => s.id === selectedSize)!;
                    const unitPrice = size.basePrice + (borderCheese ? (size.borderDelta ?? 0) : 0);
                    const withDiscount = openOffer.discountPercent > 0
                      ? Math.round((unitPrice + extras) * (1 - openOffer.discountPercent / 100))
                      : unitPrice + extras;
                    addToCart({
                      id: uid('cart'),
                      productId: openOffer.productId,
                      name: openOffer.name,
                      emoji: openOffer.emoji,
                      unitPrice, qty: 1, size: size.id, borderCheese,
                      extrasTotal: extras,
                      ingredients: selectedIngs,
                      notes: `Oferta: ${openOffer.name}${openOffer.discountPercent > 0 ? ` (-${openOffer.discountPercent}%)` : ''}`,
                    });
                    toast.success(`${openOffer.name} agregada · ${formatCUP(withDiscount)}`);
                  }
                  setOpenOffer(null);
                  setStep('size');
                  setInitialDefaults([]);
                  setTimeout(() => window.scrollTo(0, scrollRef.current), 100);
                }} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X size={16} /></button>
              </div>

              {/* Paso 1: Tamaño */}
              {step === 'size' && (
                <>
                  <p className="text-xs font-bold text-muted-foreground mb-2">Elige el tamaño:</p>
                  <div className="grid grid-cols-1 gap-1.5 mb-4">
                    {sizes.map((s) => {
                      const bp = (s.borderDelta ?? 0) + s.basePrice;
                      return (
                        <button key={s.id} onClick={() => { setSelectedSize(s.id); setStep('ingredients'); }}
                          className="flex items-center justify-between bg-secondary/60 hover:bg-secondary transition rounded-xl px-3 py-2.5 text-left">
                          <span className="text-sm font-medium">{s.label}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">{s.basePrice.toLocaleString('es-CU')} CUP</span>
                            {s.borderDelta ? <span className="text-[10px] text-muted-foreground">| Borde {bp.toLocaleString('es-CU')}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Paso 2: Ingredientes */}
              {step === 'ingredients' && currentSize && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setStep('size')} className="text-xs text-primary font-bold">← Cambiar tamaño</button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-bold text-primary">{currentSize.label}</span>
                  </div>

                  {/* Toggle Borde de queso */}
                  {borderPrice > 0 && (
                    <button
                      onClick={() => setBorderCheese((v) => !v)}
                      className={`w-full p-2.5 rounded-xl border-2 flex items-center justify-between transition mb-3 ${borderCheese ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold">🧀 Borde de queso</p>
                        <p className="text-[10px] text-muted-foreground">+{borderPrice.toLocaleString('es-CU')} CUP</p>
                      </div>
                      <span className={`w-10 h-6 rounded-full transition-colors flex items-center ${borderCheese ? 'bg-primary' : 'bg-muted-foreground'}`}>
                        <span className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${borderCheese ? 'translate-x-4' : ''}`} />
                      </span>
                    </button>
                  )}

                  <p className="text-xs font-bold text-muted-foreground mb-2">Ingredientes (agrega extras):</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto mb-3">
                    {ingredients.filter((i) => i.available).map((ing) => {
                      const ci = selectedIngs.find((s) => s.ingredientId === ing.id);
                      const qty = ci?.qty;
                      const price = getIngredientPrice(ing, selectedSize);
                      const mult = qty ? ingredientQtyMultiplier(qty) : 0;
                      const isLocked = lockedIngredientIds.has(ing.id);
                      const charge = mult * price;
                      return (
                        <div key={ing.id} className={`flex items-center gap-2 p-2 rounded-lg border ${qty ? 'border-primary bg-primary/10' : 'border-border'} ${isLocked ? 'ring-2 ring-primary/40' : ''}`}>
                          <span className="text-xl">{ing.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold leading-tight flex items-center gap-1">
                              {ing.name}
                              {isLocked && <span title="Ingrediente obligatorio de la oferta">🔒</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {charge > 0 ? `+${charge.toLocaleString('es-CU')} CUP` : `+${price.toLocaleString('es-CU')} CUP`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {qty ? (
                              <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
                                {QTY_OPTIONS.map((q) => {
                                  // FASE H: si está locked, solo permitir cambiar qty, no eliminar
                                  const isQtyActive = qty === q;
                                  const handleClick = () => {
                                    if (isLocked) {
                                      // Solo cambiar qty, NO permitir null (no eliminar)
                                      setIngQty(ing.id, q);
                                    } else {
                                      if (q === qty) setIngQty(ing.id, null);
                                      else setIngQty(ing.id, q);
                                    }
                                  };
                                  return (
                                    <button key={q} onClick={handleClick}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${isQtyActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'} ${isLocked && q === qty ? 'cursor-default' : ''}`}>
                                      {q === 'normal' ? 'N' : q === 'doble' ? 'D' : 'T'}
                                    </button>
                                  );
                                })}
                                {/* FASE H: NO mostrar botón de quitar si está locked */}
                                {isLocked && (
                                  <span className="text-[9px] text-muted-foreground px-1">🔒</span>
                                )}
                              </div>
                            ) : (
                              <button onClick={() => setIngQty(ing.id, 'normal')} className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center animate-button-pop">
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-2 mb-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total {openOffer.discountPercent > 0 ? `(−${openOffer.discountPercent}%)` : ''}</span>
                    <span className="font-cartoon text-base text-primary">
                      {(() => {
                        const base = total;
                        const withDiscount = openOffer.discountPercent > 0
                          ? Math.round(base * (1 - openOffer.discountPercent / 100))
                          : base;
                        return formatCUP(withDiscount);
                      })()}
                    </span>
                  </div>

                  <button onClick={() => {
                    // Enviar al carrito la oferta con sus ingredientes locked + extras
                    const size = sizes.find((s) => s.id === selectedSize)!;
                    const unitPrice = size.basePrice + (borderCheese ? (size.borderDelta ?? 0) : 0);
                    addToCart({
                      id: uid('cart'),
                      productId: openOffer.productId,
                      name: openOffer.name,
                      emoji: openOffer.emoji,
                      unitPrice, qty: 1, size: size.id, borderCheese,
                      extrasTotal: extras,
                      ingredients: selectedIngs,
                      notes: `Oferta: ${openOffer.name}${openOffer.discountPercent > 0 ? ` (-${openOffer.discountPercent}%)` : ''}`,
                    });
                    toast.success(`${openOffer.name} agregada`);
                    setOpenOffer(null);
                    setStep('size');
                    setInitialDefaults([]);
                    setTimeout(() => window.scrollTo(0, scrollRef.current), 100);
                  }} className="w-full bg-primary text-primary-foreground py-3 rounded-full font-bold text-sm hover:opacity-95 animate-button-pop">
                    Enviar al carrito · {(() => {
                      const withDiscount = openOffer.discountPercent > 0
                        ? Math.round(total * (1 - openOffer.discountPercent / 100))
                        : total;
                      return formatCUP(withDiscount);
                    })()}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryChip({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji: string }) {
  return (
    <button onClick={onClick} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'}`}>
      <span>{emoji}</span>{label}
    </button>
  );
}
