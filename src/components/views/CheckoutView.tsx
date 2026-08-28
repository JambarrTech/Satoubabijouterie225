import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Truck, Loader2, ExternalLink, Lock, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { Cart } from '../../types';
import { createOrder, fetchOrderCallback, CreateOrderResponse } from '../../lib/api/orders';
import { fetchCurrentUser } from '../../lib/api/auth';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CheckoutViewProps {
  cart: Cart;
  selectedCartItemIds?: string[]; // 1 ou N articles cochés dans panier ; undefined = tout
  onBack: () => void;
  onOrderSuccess: (order: any) => void;
}

export function CheckoutView({ cart, selectedCartItemIds, onBack, onOrderSuccess }: CheckoutViewProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const itemsToPay = useMemo(() => {
    if (!selectedCartItemIds || selectedCartItemIds.length === 0) return cart.items;
    const set = new Set(selectedCartItemIds);
    return cart.items.filter(i => set.has(i.id));
  }, [cart.items, selectedCartItemIds]);

  const estimatedSubtotal = useMemo(() => itemsToPay.reduce((s, i) => s + i.product.price * i.quantity, 0), [itemsToPay]);
  const estimatedTotal = useMemo(() => {
    // Estimation locale; le vrai total est recalculé serveur (coupon + livraison)
    if (itemsToPay.length === cart.items.length) return cart.total;
    return estimatedSubtotal + cart.shippingFee;
  }, [estimatedSubtotal, cart.total, cart.shippingFee, itemsToPay.length, cart.items.length]);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setCity(user.city || 'Abidjan');
    }).catch(() => {});
    fetchStoreSettings().then(setStoreSettings).catch(() => {});

    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const orderIdParam = urlParams.get('orderId');
    if (paymentParam === 'success' && orderIdParam) {
      handlePaymentCallback(orderIdParam);
    }
  }, []);

  useEffect(() => {
    if (step === 5 && paymentUrl) {
      const timer = setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [step, paymentUrl]);

  const handleSubmitOrder = async () => {
    if (itemsToPay.length === 0) {
      setError('Votre sélection est vide — retournez au panier.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const payload: any = {
        shippingAddress: { fullName, phone, address, city, notes },
      };
      if (selectedCartItemIds && selectedCartItemIds.length > 0 && selectedCartItemIds.length !== cart.items.length) {
        payload.cartItemIds = selectedCartItemIds;
      }
      const response = await createOrder(payload) as CreateOrderResponse;

      if (response.paymentUrl) {
        setPaymentUrl(response.paymentUrl);
        setStep(5);
      } else {
        setCompletedOrder(response);
        setStep(4);
        onOrderSuccess(response);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentCallback = async (callbackOrderId: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      const order = await fetchOrderCallback(callbackOrderId);
      setCompletedOrder(order);
      window.history.replaceState({}, '', window.location.pathname);
      if (order.paymentStatus === 'PAID') {
        setStep(4);
        onOrderSuccess(order);
      } else {
        setStep(3);
        setError('Le paiement Wave est en attente ou a échoué. Vous serez notifié à confirmation.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur vérification paiement Wave');
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentUrl = () => {
    if (paymentUrl) window.location.href = paymentUrl;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex items-center justify-between">
        {step !== 5 && step !== 4 && (
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0B5D1E] transition-colors">
            <ArrowLeft size={16} />
            <span>Retour au panier</span>
          </button>
        )}
        <h1 className="font-serif text-xl font-bold text-gray-900">Validation de commande</h1>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: 'Adresse' },
          { num: 2, label: 'Livraison' },
          { num: 3, label: 'Wave' },
          { num: 4, label: 'Confirmation' },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s.num ? 'bg-[#0B5D1E] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
              {s.num}
            </div>
            <span className={`text-[10px] mt-1 font-medium ${step >= s.num ? 'text-[#0B5D1E]' : 'text-gray-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Recap articles sélectionnés — visible dès étape 1 */}
      {step < 4 && step !== 5 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <ShoppingBag size={16} className="text-[#0B5D1E]" /> Articles à payer ({itemsToPay.length}/{cart.items.length})
            {selectedCartItemIds && selectedCartItemIds.length > 0 && selectedCartItemIds.length !== cart.items.length && (
              <span className="text-xs font-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Sélection partielle — le reste reste dans votre panier</span>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            {itemsToPay.map(item => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <img src={item.product.images[0]} alt={item.product.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-gray-900 text-xs">{item.product.name} × {item.quantity}</div>
                  <div className="text-xs text-gray-500">{item.product.price.toLocaleString()} FCFA</div>
                </div>
                <div className="font-semibold text-xs">{(item.product.price * item.quantity).toLocaleString()} FCFA</div>
              </div>
            ))}
          </div>
          {itemsToPay.length === 0 && <p className="text-xs text-red-600">Aucun article sélectionné.</p>}
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
        
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-[#0B5D1E]" /> 01. Adresse de livraison
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <Input label="Téléphone Wave (Mobile)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <Input label="Adresse précise (Quartier, Rue, Immeuble)" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input label="Instructions livreur (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Interphone 12" />
            </div>
            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={() => setStep(2)}>Continuer vers la livraison</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
              <Truck size={20} className="text-[#0B5D1E]" /> 02. Livraison sécurisée
            </h3>
            <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-[#0B5D1E] bg-[#EAF7ED]/50 cursor-pointer">
              <input type="radio" name="shipping" defaultChecked className="mt-1" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-bold text-sm text-gray-900">Coursier SaTouba (Abidjan & environs)</span>
                  <span className="font-bold text-[#0B5D1E]">Gratuit</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Remise en main propre sous 24-48h avec certificat d’authenticité.</p>
              </div>
            </label>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button size="lg" onClick={() => setStep(3)}>Continuer vers le paiement</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="font-serif text-xl font-bold text-gray-900">03. Paiement</h3>

            {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}

            <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center gap-4">
              <img src="/wave-logo.svg" alt="Wave" className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">Wave <span className="inline-flex items-center gap-1 text-[10px] bg-[#0B5D1E] text-white px-2 py-0.5 rounded-full"><Lock size={10}/> Montant verrouillé</span></h4>
                <p className="text-xs text-gray-500 mt-1">Vous serez redirigé vers Wave pour payer. Le montant ne peut pas être modifié.</p>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between">
              <span className="text-sm font-medium">Total à payer</span>
              <span className="text-xl font-black">{estimatedTotal.toLocaleString()} FCFA</span>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
              <Button size="lg" isLoading={isSubmitting} onClick={handleSubmitOrder} disabled={itemsToPay.length===0}>
                Payer {estimatedTotal.toLocaleString()} FCFA avec Wave
              </Button>
            </div>
          </div>
        )}

        {step === 5 && paymentUrl && (
          <div className="text-center py-12 space-y-6">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="w-20 h-20 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto shadow-inner">
              <Loader2 size={40} className="animate-spin" />
            </motion.div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-bold">Redirection Wave</span>
              <h3 className="font-serif text-2xl font-bold text-gray-900 mt-1">{estimatedTotal.toLocaleString()} FCFA</h3>
              <p className="text-sm text-gray-600 mt-2">Vous allez être redirigé vers <strong>Wave</strong>.</p>
            </div>
            <div className="pt-4 flex justify-center gap-4">
              <Button variant="outline" onClick={() => { setStep(3); setPaymentUrl(null); }}>Annuler</Button>
              <Button size="lg" isLoading={isSubmitting} onClick={openPaymentUrl} rightIcon={<ExternalLink size={18} />}>Payer avec Wave</Button>
            </div>
            <p className="text-xs text-gray-500">Redirection automatique dans 1s.</p>
          </div>
        )}

        {step === 4 && completedOrder && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-bold">Commande validée</span>
              <h3 className="font-serif text-3xl font-bold text-gray-900 mt-1">Merci !</h3>
              <p className="text-sm text-gray-600 mt-2">Commande <strong className="text-gray-900">{completedOrder.orderNumber}</strong> — {completedOrder.totalAmount?.toLocaleString()} FCFA payé via Wave. Nos artisans préparent votre bijou.</p>
            </div>
            <div className="pt-4 flex justify-center gap-4">
              <Button onClick={onBack}>Retour à l’accueil</Button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
