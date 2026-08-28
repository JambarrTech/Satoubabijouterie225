import React, { useState } from 'react';
import { Trash2, ShoppingBag, ArrowRight, Tag, Check, ShieldCheck, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { Cart } from '../../types';
import { removeFromCart, applyCoupon } from '../../lib/api/cart';
import { Price } from '../ui/Price';
import { Button } from '../ui/Button';

interface CartViewProps {
  cart: Cart;
  onUpdateCart: (newCart: Cart) => void;
  onNavigate: (tab: string) => void;
  onProceedToCheckout: () => void;
}

export function CartView({ cart, onUpdateCart, onNavigate, onProceedToCheckout }: CartViewProps) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleRemove = async (itemId: string) => {
    try {
      const updated = await removeFromCart(itemId);
      onUpdateCart(updated);
    } catch (e) {
      console.error(e);
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
      setCouponSuccess(`Code "${res.coupon.code}" appliqué avec succès !`);
    } catch (err: any) {
      setCouponError(err.message || 'Code invalide');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="pb-6 border-b border-gray-100">
        <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Votre Panier</span>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Articles Sélectionnés ({cart.items.length})</h1>
      </div>

      {cart.items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center py-24 bg-white rounded-3xl border border-gray-100 p-8 space-y-4 max-w-lg mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
            className="w-16 h-16 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto"
          >
            <ShoppingBag size={32} />
          </motion.div>
          <h3 className="font-serif text-xl font-bold text-gray-900">Votre panier est vide</h3>
          <p className="text-sm text-gray-500">Découvrez nos superbes collections et offrez-vous le meilleur de la bijouterie.</p>
          <div className="pt-4">
            <Button onClick={() => onNavigate('catalogue')} icon={<ArrowRight size={16} />}>
              Explorer le catalogue
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Cart items list */}
          <div className="lg:col-span-7 space-y-4">
            {cart.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs"
              >
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-24 h-24 rounded-xl object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-semibold text-gray-400">
                    {item.product.material || 'Or 18K'} {item.selectedSize ? `• Taille ${item.selectedSize}` : ''}
                  </span>
                  <h3 className="font-serif font-medium text-gray-900 text-sm truncate mb-1">
                    {item.product.name}
                  </h3>
                  <Price amount={item.product.price} size="sm" />
                  <span className="text-xs text-gray-500 mt-1 block">Quantité : {item.quantity}</span>
                </div>

                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  aria-label="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Cart summary & checkout */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-serif text-lg font-bold text-gray-900 pb-4 border-b border-gray-100">
                Résumé de la commande
              </h3>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Code promo (ex: SATOUBA10)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs uppercase font-medium focus:outline-none focus:border-[#0B5D1E]"
                    />
                  </div>
                  <Button type="submit" size="sm" isLoading={isApplying}>
                    Appliquer
                  </Button>
                </div>
                {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                {couponSuccess && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check size={14} />{couponSuccess}</p>}
              </form>

              <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span className="font-medium text-gray-900">{cart.subtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison sécurisée</span>
                  <span className="font-medium text-gray-900">
                    {cart.shippingFee === 0 ? 'Gratuite' : `${cart.shippingFee.toLocaleString()} FCFA`}
                  </span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Réduction ({cart.couponCode})</span>
                    <span>-{cart.discount.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-4 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-[#D9A441] text-xl">{cart.total.toLocaleString()} FCFA</span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={onProceedToCheckout}
                icon={<ArrowRight size={18} />}
                className="w-full shadow-lg"
              >
                Procéder au paiement
              </Button>
            </div>

            <div className="bg-[#EAF7ED] p-4 rounded-2xl border border-[#0B5D1E]/20 flex items-center gap-3">
              <ShieldCheck size={24} className="text-[#0B5D1E] shrink-0" />
              <p className="text-xs text-[#064A15] leading-relaxed">
                Paiement 100% sécurisé (Wave, Orange Money ou Paiement à la livraison). Certificat d'authenticité garanti.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
