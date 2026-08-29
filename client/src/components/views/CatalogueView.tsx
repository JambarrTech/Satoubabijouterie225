import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, Category } from '../../types';
import { fetchProducts } from '../../lib/api/products';
import { ProductCard } from '../product/ProductCard';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';

interface CatalogueViewProps {
  categories: Category[];
  selectedCategorySlug?: string;
  onSelectProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  favorites: string[];
  onAddToCart: (product: Product) => void;
}

export function CatalogueView({
  categories,
  selectedCategorySlug,
  onSelectProduct,
  onToggleFavorite,
  favorites,
  onAddToCart
}: CatalogueViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategorySlug || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const loadProducts = async (pageNum: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProducts({
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: debouncedSearch || undefined,
        page: pageNum,
        limit: 20,
        sort: sortBy,
      });
      setProducts(result.data);
      setPagination(result.pagination);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory, debouncedSearch, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title & Search header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Catalogue SaTouba</span>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Nos Collections Exclusives</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination.total} bijoux trouvés</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un bijou..."
              className="pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0B5D1E] w-full sm:w-64"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-[#0B5D1E]"
          >
            <option value="newest">Nouveautés</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="popular">Plus populaires</option>
          </select>
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeCategory === 'all'
              ? 'bg-[#0B5D1E] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#0B5D1E]'
          }`}
        >
          Tous les bijoux
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.slug)}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat.slug
                ? 'bg-[#0B5D1E] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-[#0B5D1E]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid / States */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-red-100 p-8">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <Button onClick={() => loadProducts(1)} icon={<RefreshCw size={16} />}>Réessayer</Button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
          <p className="text-gray-500 font-medium">Aucun bijou ne correspond à vos critères.</p>
          <Button variant="outline" onClick={() => { setActiveCategory('all'); setSearchQuery(''); setSortBy('newest'); }}>
            Reinitialiser les filtres
          </Button>
        </div>
      ) : (
        <>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {products.map((product) => (
              <motion.div
                key={product.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <ProductCard
                  product={product}
                  onSelect={onSelectProduct}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.includes(product.id)}
                  onAddToCart={onAddToCart}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadProducts(page - 1)}
                icon={<ChevronLeft size={16} />}
              >
                Précédent
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => loadProducts(page + 1)}
              >
                Suivant
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
