import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { Product } from '../../types';
import { Price } from '../ui/Price';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onSelect: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({
  product,
  onSelect,
  onToggleFavorite,
  isFavorite,
  onAddToCart
}: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { toast } = useToast();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(product.id);
    toast(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris', 'success');
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {/* Image skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
        )}
        <img
          src={imgError ? '/placeholder.svg' : (product.images?.[0] || '/placeholder.svg')}
          alt={product.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-700 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          referrerPolicy="no-referrer"
        />

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discount > 0 && <Badge variant="gold">-{discount}%</Badge>}
          {product.isNew && <Badge variant="new">Nouveau</Badge>}
          {product.isBestSeller && <Badge variant="primary">Best-seller</Badge>}
        </div>

        {/* Favorite button */}
        <motion.button
          onClick={handleFavoriteClick}
          whileTap={{ scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="absolute top-3 right-3 p-2.5 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:text-red-500 shadow-sm transition-all duration-200 z-10 hover:bg-white"
        >
          <Heart
            size={18}
            className={`transition-all duration-300 ${isFavorite ? "fill-red-500 text-red-500 scale-110" : "text-gray-600"}`}
          />
        </motion.button>

        {/* Add to cart button — visible on mobile, slides up on hover on desktop */}
        <div className="absolute inset-x-3 bottom-3 md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0 transition-all duration-300 z-10">
          <AnimatePresence mode="wait">
            <motion.button
              key={justAdded ? 'added' : 'normal'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleAdd}
              whileTap={{ scale: 0.92 }}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold shadow-lg flex items-center justify-center gap-2 transition-colors duration-300 ${
                justAdded
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#0B5D1E] hover:bg-[#064A15] text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check size={15} />
                  Ajoute !
                </>
              ) : (
                <>
                  <ShoppingBag size={15} />
                  Ajouter au panier
                </>
              )}
            </motion.button>
          </AnimatePresence>
        </div>

        {/* Out of stock overlay */}
        {product.stockQuantity <= 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-full">Rupture de stock</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {product.material && (
            <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider mb-1 block">
              {product.material}
            </span>
          )}
          <h3 className="font-serif font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-[#0B5D1E] transition-colors duration-200 leading-snug">
            {product.name}
          </h3>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <Price amount={product.price} compareAt={product.compareAtPrice} size="sm" />
        </div>
      </div>
    </motion.div>
  );
}
