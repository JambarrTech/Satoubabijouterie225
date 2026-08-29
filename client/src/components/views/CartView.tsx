import { useState, useMemo, useEffect } from 'react';
import { Trash2, ShoppingBag, ArrowRight, Check, Plus, Minus, Square, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Cart } from '../../types';
import { removeFromCart, updateCartItemQuantity } from '../../lib/api/cart';
import { Price } from '../ui/Price';
import { Button } from '../ui/Button';
import { CheckoutModal } from '../checkout/CheckoutModal';
import { useToast } from '../ui/Toast';

interface CartViewProps {
  cart: Cart;
  onUpdateCart: (newCart: Cart) => void;
  onNavigate: (tab: string) => void;
  onRefreshCart?: () => void;
}

export function CartView({ cart, onUpdateCart, onNavigate, onRefreshCart }: CartViewProps) {
  const { toast } = useToast();
  const safeItems = cart?.items ?? [];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>(safeItems.map(i => i.id)));
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    setSelectedIds((prev: Set<string>) => {
      const existing = new Set<string>(safeItems.map(i => i.id));
      if (existing.size === 0 && prev.size === 0) return prev;
      const kept = new Set<string>(Array.from(prev).filter((id: string) => existing.has(id)));
      for (const item of safeItems) {
        if (!prev.has(item.id)) kept.add(item.id);
      }
      if (kept.size === 0 && safeItems.length > 0) return new Set<string>(safeItems.map(i => i.id));
      return kept;
    });
  }, [safeItems]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === safeItems.length) {
      setSelectedIds(new Set<string>());
    } else {
      setSelectedIds(new Set<string>(safeItems.map(i => i.id)));
    }
  };

  const selectedItems = useMemo(() => safeItems.filter(i => selectedIds.has(i.id)), [safeItems, selectedIds]);
  const selectedSubtotal = useMemo(() => selectedItems.reduce((s, i) => s + (Number(i?.product?.price) || 0) * (Number(i?.quantity) || 0), 0), [selectedItems]);
  const selectedCount = selectedItems.reduce((s, i) => s + (i?.quantity || 0), 0);
  const isAllSelected = selectedIds.size === safeItems.length && safeItems.length > 0;

  const displayShipping = useMemo(() => {
    if (isAllSelected) return cart.shippingFee;
    if (cart.shippingFee === 0) return 0;
    const ratio = cart.subtotal > 0 ? selectedSubtotal / cart.subtotal : 0;
    return Math.round(cart.shippingFee * ratio);
  }, [isAllSelected, cart.shippingFee, cart.subtotal, selectedSubtotal]);

  const displayTotal = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    return selectedSubtotal + displayShipping;
  }, [selectedSubtotal, displayShipping, selectedIds.size]);

  const handleRemove = async (itemId: string) => {
    try {
      const updated = await removeFromCart(itemId);
      onUpdateCart(updated);
    } catch (e) {
      toast('Erreur lors de la suppression', 'error');
    }
  };

  const handleQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setUpdatingId(itemId);
    try {
      const updated = await updateCartItemQuantity(itemId, newQty);
      onUpdateCart(updated);
    } catch (e: any) {
      toast(e.message || 'Erreur de mise a jour', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOrder = () => {
    if (selectedIds.size === 0) {
      return;
    }
    setIsCheckoutOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-6 border-b border-gray-100 flex justify-between items-end">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Votre Panier</span>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Panier ({safeItems.length})</h1>
        </div>
        {safeItems.length > 0 && (
          <button onClick={toggleSelectAll} className="text-xs font-semibold text-[#0B5D1E] flex items-center gap-1.5 hover:underline">
            {isAllSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
            {isAllSelected ? 'Tout deselectionner' : 'Tout selectionner'}
          </button>
        )}
      </div>

      {safeItems.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-white rounded-3xl border border-gray-100 p-8 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto">
            <ShoppingBag size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-900">Votre panier est vide</h3>
          <p className="text-sm text-gray-500">Ajoutez 1 ou plusieurs bijoux pour commander.</p>
          <div className="pt-4">
            <Button onClick={() => onNavigate('catalogue')} icon={<ArrowRight size={16} />}>Explorer le catalogue</Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-4">
            <AnimatePresence mode="popLayout">
            {safeItems.map((item) => {
              if (!item?.id || !item?.product) return null;
              const isSelected = selectedIds.has(item.id);
              const price = Number(item.product.price) || 0;
              const qty = Number(item.quantity) || 0;
              const images = Array.isArray(item.product.images) ? item.product.images : [];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60, scale: 0.9, transition: { duration: 0.25 } }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`flex items-center gap-3 bg-white p-4 rounded-2xl border-2 shadow-xs transition-colors ${isSelected ? 'border-[#0B5D1E]/30 bg-[#EAF7ED]/10' : 'border-gray-100 opacity-75'}`}
                >
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#0B5D1E] border-[#0B5D1E] text-white' : 'border-gray-300 text-transparent'}`}
                    aria-label={isSelected ? 'Deselectionner' : 'Selectionner'}
                  >
                    <Check size={14} />
                  </button>
                  {images[0] ? (
                    <img src={images[0]} alt={item.product.name || ''} className="w-20 h-20 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-semibold text-gray-400">
                      {item.product.material || 'Or 18K'} {item.selectedSize ? '- Taille ' + item.selectedSize : ''}
                    </span>
                    <h3 className="font-serif font-medium text-gray-900 text-sm truncate mb-1">{item.product.name || 'Produit'}</h3>
                    <Price amount={price} size="sm" />
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => handleQuantity(item.id, qty - 1)} disabled={updatingId === item.id || qty <= 1} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-[#0B5D1E] disabled:opacity-40">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{updatingId === item.id ? '...' : qty}</span>
                      <button onClick={() => handleQuantity(item.id, qty + 1)} disabled={updatingId === item.id || qty >= (item.product.stockQuantity || 0)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-[#0B5D1E] disabled:opacity-40">
                        <Plus size={12} />
                      </button>
                      <span className="text-[10px] text-gray-400 ml-1">{item.product.stockQuantity || 0} dispo</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900">{(price * qty).toLocaleString()} FCFA</div>
                    <button onClick={() => handleRemove(item.id)} className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-auto" aria-label="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-serif text-lg font-bold text-gray-900 pb-4 border-b border-gray-100">
                Resume - {selectedItems.length}/{safeItems.length} selectionne{selectedItems.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total selection</span>
                  <span className="font-medium text-gray-900">{selectedSubtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span className="font-medium text-gray-900">{displayShipping === 0 ? 'Gratuite' : displayShipping.toLocaleString() + ' FCFA'}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-4 border-t border-gray-100">
                  <span>Total estime</span>
                  <span className="text-[#0B5D1E] text-xl">{displayTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
              <Button size="lg" onClick={handleOrder} icon={<ArrowRight size={18} />} className="w-full shadow-lg" disabled={selectedIds.size === 0}>
                {selectedIds.size === 0 ? 'Selectionnez des articles' : 'Commander ' + selectedCount + ' article' + (selectedCount > 1 ? 's' : '')}
              </Button>
              {selectedIds.size > 0 && !isAllSelected && (
                <p className="text-xs text-center text-gray-500">{safeItems.length - selectedIds.size} article(s) resteront dans votre panier.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedIds={selectedIds}
        selectedSubtotal={selectedSubtotal}
        onSuccess={() => { onNavigate('commandes'); }}
        onCartRefresh={onRefreshCart}
      />
    </div>
  );
}