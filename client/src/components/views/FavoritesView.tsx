import { useState, useEffect } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { fetchFavorites } from '../../lib/api/favorites';
import { ProductCard } from '../product/ProductCard';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { AbortController } from 'abort-controller';

interface FavoritesViewProps {
  onSelectProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  favorites: string[];
  onAddToCart: (product: Product) => void;
  onNavigate: (tab: string) => void;
}

export function FavoritesView({
  onSelectProduct,
  onToggleFavorite,
  favorites,
  onAddToCart,
  onNavigate
}: FavoritesViewProps) {
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchFavorites({ signal: controller })
      .then(setFavProducts)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort();
  }, [favorites]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="pb-6 border-b border-gray-100">
        <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Ma Liste de Souhaits</span>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Vos Bijoux Favoris ({favProducts.length})</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : favProducts.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 p-8 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto">
            <Heart size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-900">Votre liste de souhaits est vide</h3>
          <p className="text-sm text-gray-500">Explorez notre catalogue et ajoutez vos pièces favorites en cliquant sur le cœur.</p>
          <div className="pt-4">
            <Button onClick={() => onNavigate('catalogue')} icon={<ArrowRight size={16} />}>
              Découvrir le catalogue
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {favProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.includes(product.id)}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}

    </div>
  );
}
