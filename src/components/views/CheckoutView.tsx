import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, MapPin, Truck, CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Cart, Order } from '../../types';
import { createOrder, fetchOrderCallback, CreateOrderResponse } from '../../lib/api/orders';
import { fetchCurrentUser } from '../../lib/api/auth';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CheckoutViewProps {
  cart: Cart;
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

export function CheckoutView({ cart, onBack, onOrderSuccess }: CheckoutViewProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setCity(user.city || 'Dakar');
    }).catch(() => {});
    fetchStoreSettings().then(setStoreSettings).catch(() => {});

    // Check for payment callback on mount
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const orderIdParam = urlParams.get('orderId');
    if (paymentParam === 'success' && orderIdParam) {
      handlePaymentCallback(orderIdParam);
    }
  }, []);

  // Auto-redirection vers le prestataire
  useEffect(() => {
    if (step === 5 && paymentUrl) {
      const timer = setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [step, paymentUrl]);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await createOrder({
        shippingAddress: { fullName, phone, address, city, notes },
        paymentMethod
      }) as CreateOrderResponse;

      setOrderId(response.id);

      if (response.paymentUrl) {
        // Redirect to payment provider
        setPaymentUrl(response.paymentUrl);
        setStep(5); // Payment redirect step
      } else {
        // No payment URL (should not happen with new flow)
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
      setOrderId(order.id);
      // Nettoie l'URL pour éviter de rejouer le callback au refresh
      window.history.replaceState({}, '', window.location.pathname);
      if (order.paymentStatus === 'PAID') {
        setStep(4);
        onOrderSuccess(order);
      } else {
        setStep(3);
        setError('Le paiement a échoué ou est en attente. Veuillez réessayer.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification du paiement');
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentUrl = () => {
    if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex items-center justify-between">
        {step !== 5 && step !== 4 && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0B5D1E] transition-colors"
          >
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
          { num: 3, label: 'Paiement' },
          { num: 4, label: 'Confirmation' },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= s.num ? 'bg-[#0B5D1E] text-white shadow-sm' : 'bg-gray-100 text-gray-400'
            }`}>
              {s.num}
            </div>
            <span className={`text-[10px] mt-1 font-medium ${step >= s.num ? 'text-[#0B5D1E]' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
        
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-[#0B5D1E]" />
              01. Adresse de livraison au Sénégal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nom complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Téléphone (Mobile / WhatsApp)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <Input
              label="Adresse précise (Quartier, Rue, Immeuble)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                label="Instructions pour le livreur (optionnel)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Sonner à l'interphone 12"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={() => setStep(2)}>
                Continuer vers la livraison
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
              <Truck size={20} className="text-[#0B5D1E]" />
              02. Mode de livraison
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-[#0B5D1E] bg-[#EAF7ED]/50 cursor-pointer">
                <input type="radio" name="shipping" defaultChecked className="mt-1" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-sm text-gray-900">Coursier Sécurisé SaTouba (Dakar & Environs)</span>
                    <span className="font-bold text-[#0B5D1E]">
                      {cart.subtotal >= (storeSettings?.free_shipping_threshold || 200000) ? 'Gratuit' : `${(storeSettings?.shipping_fee || 5000).toLocaleString()} FCFA`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Livraison VIP en main propre sous 24 à 48h avec remise sécurisée et certificat.</p>
                </div>
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button size="lg" onClick={() => setStep(3)}>Continuer vers le paiement</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={20} className="text-[#0B5D1E]" />
              03. Mode de paiement sécurisé
            </h3>

            {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'WAVE', name: 'Wave', desc: 'Paiement mobile instantané sans frais' },
                { id: 'ORANGE_MONEY', name: 'Orange Money', desc: 'Sécurisé par code OTP' },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === m.id ? 'border-[#0B5D1E] bg-[#EAF7ED]/40 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-serif font-bold text-gray-900 text-sm mb-1">{m.name}</h4>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between text-sm font-semibold">
              <span>Montant total à régler :</span>
              <span className="text-xl text-[#D9A441]">{cart.total.toLocaleString()} FCFA</span>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
              <Button size="lg" isLoading={isSubmitting} onClick={handleSubmitOrder}>
                Confirmer et payer
              </Button>
            </div>
          </div>
        )}

        {step === 5 && paymentUrl && (
          <div className="text-center py-12 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-20 h-20 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto shadow-inner"
            >
              <Loader2 size={40} className="animate-spin" />
            </motion.div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-bold">Redirection vers le paiement</span>
              <h3 className="font-serif text-2xl font-bold text-gray-900 mt-1">Finalisation du paiement</h3>
              <p className="text-sm text-gray-600 mt-2">
                Vous allez être redirigé vers <strong className="text-gray-900">{paymentMethod === 'WAVE' ? 'Wave' : 'Orange Money'}</strong> pour valider votre paiement.
              </p>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep(3);
                  setPaymentUrl(null);
                }}
              >
                Annuler
              </Button>
              <Button 
                size="lg" 
                isLoading={isSubmitting} 
                onClick={openPaymentUrl}
                rightIcon={<ExternalLink size={18} />}
              >
                Payer avec {paymentMethod === 'WAVE' ? 'Wave' : 'Orange Money'}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Si la redirection ne se fait pas automatiquement, cliquez sur le bouton ci-dessus.
            </p>
          </div>
        )}

        {step === 4 && completedOrder && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-bold">Commande validée avec succès</span>
              <h3 className="font-serif text-3xl font-bold text-gray-900 mt-1">Merci pour votre confiance !</h3>
              <p className="text-sm text-gray-600 mt-2">
                Votre numéro de commande est le <strong className="text-gray-900">{completedOrder.orderNumber}</strong>. Nos maîtres artisans préparent votre bijou.
              </p>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <Button onClick={onBack}>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}