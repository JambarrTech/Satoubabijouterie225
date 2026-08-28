import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, ShoppingBag, ArrowRight, Tag, Check, ShieldCheck, Plus, Minus, Square, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { Cart } from '../../types';
import { removeFromCart, updateCartItemQuantity, applyCoupon } from '../../lib/api/cart';
import { Price } from '../ui/Price';
import { Button } from '../ui/Button';

interface CartViewProps {
  cart: Cart;
  onUpdateCart: (newCart: Cart) => void;
  onNavigate: (tab: string) => void;
  onProceedToCheckout: (selectedIds?: string[]) => void;
}

export function CartView({ cart, onUpdateCart, onNavigate, onProceedToCheckout }: CartViewProps) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>(cart.items.map(i => i.id)));
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Keep selection in sync: auto-select newcomers, remove deleted
  useEffect(() => {
    setSelectedIds((prev: Set<string>) => {
      const existing = new Set<string>(cart.items.map(i => i.id));
      const kept = new Set<string>(Array.from(prev).filter((id: string) => existing.has(id)));
      for (const item of cart.items) {
        if (!prev.has(item.id)) kept.add(item.id);
      }
      if (kept.size === 0 && cart.items.length > 0) return new Set<string>(cart.items.map(i => i.id));
      return kept;
    });
  }, [cart.items]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cart.items.length) {
      setSelectedIds(new Set<string>());
    } else {
      setSelectedIds(new Set<string>(cart.items.map(i => i.id)));
    }
  };

  const selectedItems = useMemo(() => cart.items.filter(i => selectedIds.has(i.id)), [cart.items, selectedIds]);
  const selectedSubtotal = useMemo(() => selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0), [selectedItems]);
  const selectedCount = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const isAllSelected = selectedIds.size === cart.items.length && cart.items.length > 0;

  const handleRemove = async (itemId: string) => {
    try {
      const updated = await removeFromCart(itemId);
      onUpdateCart(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setUpdatingId(itemId);
    try {
      const updated = await updateCartItemQuantity(itemId, newQty);
      onUpdateCart(updated);
    } catch (e: any) {
      alert(e.message || 'Erreur quantité');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplying(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const res = await applyCoupon(couponInput);
      onUpdateCart(res.cart);
      setCouponSuccess(`Code "${res.coupon.code}" appliqué !`);
    } catch (err: any) {
      setCouponError(err.message || 'Code invalide');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCheckout = () => {
    if (selectedIds.size === 0) {
      alert('Sélectionnez au moins 1 article à payer');
      return;
    }
    const ids = isAllSelected ? undefined : Array.from(selectedIds) as string[];
    onProceedToCheckout(ids);
  };

  // Total for selection: if partial, discount prorata not exact, server will recalc precisely
  const displayTotal = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    if (isAllSelected) return cart.total;
    // For partial selection, estimate: subtotal + shipping (if threshold not reached)
    // Server will compute exact total with discount
    return selectedSubtotal + cart.shippingFee;
  }, [selectedSubtotal, cart.total, cart.shippingFee, isAllSelected, selectedIds.size]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="pb-6 border-b border-gray-100 flex justify-between items-end">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Votre Panier</span>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Panier ({cart.items.length})</h1>
          <p className="text-xs text-gray-500 mt-1">Cochez 1 ou plusieurs articles — le montant Wave est verrouillé côté serveur et non modifiable.</p>
        </div>
        {cart.items.length > 0 && (
          <button onClick={toggleSelectAll} className="text-xs font-semibold text-[#0B5D1E] flex items-center gap-1.5 hover:underline">
            {isAllSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
            {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
      </div>

      {cart.items.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-white rounded-3xl border border-gray-100 p-8 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto">
            <ShoppingBag size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-900">Votre panier est vide</h3>
          <p className="text-sm text-gray-500">Ajoutez 1 ou plusieurs bijoux avant de payer avec Wave Business.</p>
          <div className="pt-4">
            <Button onClick={() => onNavigate('catalogue')} icon={<ArrowRight size={16} />}>Explorer le catalogue</Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-7 space-y-4">
            {cart.items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 bg-white p-4 rounded-2xl border-2 shadow-xs transition-colors ${isSelected ? 'border-[#0B5D1E]/30 bg-[#EAF7ED]/10' : 'border-gray-100 opacity-75'}`}
                >
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#0B5D1E] border-[#0B5D1E] text-white' : 'border-gray-300 text-transparent'}`}
                    aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                  >
                    <Check size={14} />
                  </button>

                  <img src={item.product.images[0]} alt={item.product.name} className="w-20 h-20 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-semibold text-gray-400">
                      {item.product.material || 'Or 18K'} {item.selectedSize ? `• Taille ${item.selectedSize}` : ''}
                    </span>
                    <h3 className="font-serif font-medium text-gray-900 text-sm truncate mb-1">{item.product.name}</h3>
                    <Price amount={item.product.price} size="sm" />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleQuantity(item.id, item.quantity - 1)}
                        disabled={updatingId === item.id || item.quantity <= 1}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-[#0B5D1E] disabled:opacity-40"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{updatingId === item.id ? '…' : item.quantity}</span>
                      <button
                        onClick={() => handleQuantity(item.id, item.quantity + 1)}
                        disabled={updatingId === item.id || item.quantity >= item.product.stockQuantity}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-[#0B5D1E] disabled:opacity-40"
                      >
                        <Plus size={12} />
                      </button>
                      <span className="text-[10px] text-gray-400 ml-1">{item.product.stockQuantity} dispo</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900">{(item.product.price * item.quantity).toLocaleString()} FCFA</div>
                    <button onClick={() => handleRemove(item.id)} className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-auto" aria-label="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-serif text-lg font-bold text-gray-900 pb-4 border-b border-gray-100">Résumé — {selectedItems.length}/{cart.items.length} sélectionné{selectedItems.length>1?'s':''}</h3>

              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Code promo (ex: SATOUBA10)" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs uppercase font-medium focus:outline-none focus:border-[#0B5D1E]" />
                  </div>
                  <Button type="submit" size="sm" isLoading={isApplying}>Appliquer</Button>
                </div>
                {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                {couponSuccess && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check size={14} />{couponSuccess}</p>}
              </form>

              <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total sélection</span>
                  <span className="font-medium text-gray-900">{selectedSubtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span className="font-medium text-gray-900">{cart.shippingFee === 0 ? 'Gratuite' : `${cart.shippingFee.toLocaleString()} FCFA`}</span>
                </div>
                {cart.discount > 0 && isAllSelected && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Réduction ({cart.couponCode})</span>
                    <span>-{cart.discount.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-4 border-t border-gray-100">
                  <span>Total estimé</span>
                  <span className="text-[#0B5D1E] text-xl">{displayTotal.toLocaleString()} FCFA</span>
                </div>
                <p className="text-[11px] text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-2.5">Montant verrouillé sur Wave Business — non modifiable. Total exact recalculé serveur à la validation.</p>
              </div>

              <Button size="lg" onClick={handleCheckout} icon={<ArrowRight size={18} />} className="w-full shadow-lg" disabled={selectedIds.size === 0}>
                {selectedIds.size === 0 ? 'Sélectionnez des articles' : `Payer ${selectedCount} article${selectedCount>1?'s':''} avec Wave`}
              </Button>
              {selectedIds.size > 0 && !isAllSelected && (
                <p className="text-xs text-center text-gray-500">{cart.items.length - selectedIds.size} article(s) resteront dans votre panier.</p>
              )}
            </div>

            <div className="bg-[#EAF7ED] p-4 rounded-2xl border border-[#0B5D1E]/20 flex items-center gap-3">
              <ShieldCheck size={24} className="text-[#0B5D1E] shrink-0" />
              <p className="text-xs text-[#064A15] leading-relaxed">
                Paiement <strong>Wave Business exclusif</strong> — montant verrouillé. <strong>Coursier SaTouba (Abidjan & environs) Gratuit</strong> — Remise en main propre sous 24-48h avec certificat d’authenticité.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
