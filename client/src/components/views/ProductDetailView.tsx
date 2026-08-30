import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Heart, Share2, ShieldCheck, Truck, MessageSquare, Check, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';
import { Price } from '../ui/Price';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, size?: string) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
}

export function ProductDetailView({
  product,
  onBack,
  onAddToCart,
  onToggleFavorite,
  isFavorite
}: ProductDetailViewProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(product.images?.[0] || ');
  const [imgError, setImgError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    fetchStoreSettings().then(setSettings).catch(console.error);
  }, [product.id]);

  const handleWhatsApp = () => {
    const phone = settings?.whatsapp || '221055413074';
    const brandName = settings?.brand_name || 'SaTouba Bijouterie';
    const text = encodeURIComponent(`Bonjour ${brandName}, je suis intÃ©ressÃ©(e) par le bijou : "${product.name}" (${product.price.toLocaleString()} FCFA). Est-il disponible ?`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(product.id);
  }, [onToggleFavorite, product.id]);

  const handleAddToCart = useCallback(() => {
    onAddToCart(product, quantity, selectedSize);
    setJustAdded(true);
    toast('Ajoute au panier', 'success');
    setTimeout(() => setJustAdded(false), 2000);
  }, [onAddToCart, product, quantity, selectedSize, toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10"
    >
      
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0B5D1E] transition-colors bg-white px-4 py-2 rounded-full border border-gray-200 shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={handleToggleFavorite}
            className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:text-red-500 shadow-xs transition-colors"
          >
            <Heart size={20} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </motion.button>
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:text-[#0B5D1E] shadow-xs transition-colors"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-200 shadow-inner relative">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImage}
                src={imgError ? '/placeholder.svg' : (selectedImage || '/placeholder.svg')}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            </AnimatePresence>
            {product.isPromo && <div className="absolute top-4 left-4"><Badge variant="gold">Promotion</Badge></div>}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImage === img ? 'border-[#0B5D1E] scale-105 shadow-md' : 'border-gray-200 opacity-70'
                  }`}
                >
                  <img src={img || '/placeholder.svg'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold mb-2 block">
              {product.material || 'Haute Joaillerie'} {product.collection ? `â€¢ Collection ${product.collection}` : ''}
            </span>
            <h1 className="font-serif text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
          </div>

          <div className="py-4 border-y border-gray-100">
            <Price amount={product.price} compareAt={product.compareAtPrice} size="lg" />
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>

          {(product.material?.toLowerCase().includes('bague') || product.material?.toLowerCase().includes('bracelet') || product.name.toLowerCase().includes('bague') || product.name.toLowerCase().includes('bracelet') || product.name.toLowerCase().includes('alliance')) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-700">
                <span>Taille</span>
                <span className="text-[#0B5D1E] cursor-pointer" onClick={() => toast('Bagues : tailles 48 a 62. Mesurez votre doigt avec un ruban autour de la base.', 'info')}>Guide des tailles</span>
              </div>
              <div className="flex gap-2">
                {['48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-11 h-11 rounded-xl text-xs font-semibold border transition-all ${
                      selectedSize === size
                        ? 'bg-[#0B5D1E] text-white border-[#0B5D1E] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#0B5D1E]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">QuantitÃ©</span>
            <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl w-fit p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
              >
                -
              </button>
              <AnimatePresence mode="wait">
                <motion.span
                  key={quantity}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-8 text-center text-sm font-bold text-gray-900"
                >
                  {quantity}
                </motion.span>
              </AnimatePresence>
              <button
                onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-400">{product.stockQuantity} disponible(s)</p>
          </div>

          <div className="space-y-3 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={justAdded ? 'added' : product.stockQuantity < 1 ? 'out' : 'normal'}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full shadow-lg"
                  disabled={product.stockQuantity < 1 || justAdded}
                  icon={justAdded ? <Check size={18} /> : <ShoppingBag size={18} />}
                >
                  {product.stockQuantity < 1 ? 'Rupture de stock' : justAdded ? 'Ajoute !' : 'Ajouter au panier'}
                </Button>
              </motion.div>
            </AnimatePresence>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleWhatsApp}
              icon={<MessageSquare size={18} className="text-[#25D366]" />}
              className="w-full bg-[#EAF7ED] text-[#064A15] hover:bg-[#d5eed9]"
            >
              Contacter sur WhatsApp
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-[#0B5D1E]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Garantie 2 ans</h4>
                <p className="text-[10px] text-gray-500">Certificat inclus</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-[#0B5D1E]">
                <Truck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Livraison VIP</h4>
                <p className="text-[10px] text-gray-500">SÃ©curisÃ©e & Rapide</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </motion.div>
  );
}




