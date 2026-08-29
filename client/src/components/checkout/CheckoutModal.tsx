import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, User, CreditCard, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createOrder } from '../../lib/api/orders';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  selectedSubtotal: number;
  onSuccess: () => void;
  onCartRefresh?: () => void;
}

interface FieldErrors {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export function CheckoutModal({ isOpen, onClose, selectedIds, selectedSubtotal, onSuccess, onCartRefresh }: CheckoutModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Nom complet requis (min. 2 caracteres)';
    }
    const phoneClean = phone.replace(/\s/g, '');
    if (!phoneClean || phoneClean.length < 8 || !/^\+?\d{8,}$/.test(phoneClean)) {
      errors.phone = 'Numero de telephone invalide (+225 XX XX XX XX XX)';
    }
    if (!address.trim() || address.trim().length < 5) {
      errors.address = 'Adresse requise (min. 5 caracteres)';
    }
    if (!city.trim()) {
      errors.city = 'Ville requise';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await createOrder({
        shippingAddress: { fullName: fullName.trim(), phone: phone.trim(), address: address.trim(), city: city.trim(), notes: notes.trim() || undefined },
        cartItemIds: Array.from(selectedIds),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFullName('');
    setPhone('');
    setAddress('');
    setCity('');
    setNotes('');
    setError('');
    setFieldErrors({});
    setSuccess(false);
    onClose();
  };

  const handleViewOrders = () => {
    if (onCartRefresh) onCartRefresh();
    onSuccess();
    handleClose();
  };

  const inputClass = (field: keyof FieldErrors) =>
    `w-full rounded-xl border p-3 text-sm focus:outline-none transition-colors ${
      fieldErrors[field] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#0B5D1E]'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={success ? '' : 'Finaliser la commande'}>
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="text-center py-8 space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto"
            >
              <CheckCircle2 size={32} />
            </motion.div>
            <h3 className="font-serif text-xl font-bold text-gray-900">Commande confirmee !</h3>
            <p className="text-sm text-gray-500">Votre commande a ete enregistree avec succes. Nos artisans prepareront votre bijou.</p>
            <div className="pt-4">
              <Button onClick={handleViewOrders} icon={<ShoppingCart size={16} />}>
                Voir mes commandes
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          <div className="p-4 bg-[#EAF7ED]/40 rounded-xl border border-[#0B5D1E]/20 text-sm">
            <p className="font-semibold text-[#064A15]">Resume : {selectedIds.size} article(s)</p>
            <p className="text-gray-600">Sous-total : {selectedSubtotal.toLocaleString()} FCFA</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              <User size={12} className="inline mr-1" />Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setFieldErrors(prev => ({ ...prev, fullName: undefined })); }}
              className={inputClass('fullName')}
              placeholder="Votre nom complet"
            />
            {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              <Phone size={12} className="inline mr-1" />Telephone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setFieldErrors(prev => ({ ...prev, phone: undefined })); }}
              className={inputClass('phone')}
              placeholder="+225 07 00 00 00 00"
            />
            {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              <MapPin size={12} className="inline mr-1" />Adresse de livraison
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: undefined })); }}
              className={inputClass('address')}
              placeholder="Quartier, rue, repères..."
            />
            {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Ville</label>
            <input
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); setFieldErrors(prev => ({ ...prev, city: undefined })); }}
              className={inputClass('city')}
              placeholder="Abidjan"
            />
            {fieldErrors.city && <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Notes (optionnel)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
              placeholder="Instructions de livraison..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">Annuler</Button>
            <Button type="submit" size="lg" isLoading={isSubmitting} icon={<CreditCard size={16} />} className="flex-1">
              Confirmer la commande
            </Button>
          </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
