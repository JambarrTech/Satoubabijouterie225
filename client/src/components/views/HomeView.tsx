import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Product, Category } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { Button } from '../ui/Button';
import { apiGet } from '../../lib/apiClient';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';
import { AbortController } from 'abort-controller';

interface HomeViewProps {
  categories: Category[];
  products: Product[];
  onSelectCategory: (categorySlug: string) => void;
  onSelectProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  favorites: string[];
  onAddToCart: (product: Product) => void;
  onNavigate: (tab: string) => void;
}

export function HomeView({
  categories,
  products,
  onSelectCategory,
  onSelectProduct,
  onToggleFavorite,
  favorites,
  onAddToCart,
  onNavigate
}: HomeViewProps) {
  const bestSellers = products.filter(p => p.isBestSeller);
  const promoProducts = products.filter(p => p.isPromo);
  const [stats, setStats] = useState<{ totalCustomers: number; totalProducts: number } | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<any>('/api/stats/public', { signal: controller })
      .then((data) => {
        setStats({ totalCustomers: data.totalCustomers || 0, totalProducts: data.totalProducts || 0 });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    fetchStoreSettings({ signal: controller })
      .then(setSettings)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort();
  }, []);

  const featuredProduct = bestSellers[0] || products[0];

  if (!settings && products.length === 0) {
    return (
      <div className="space-y-16 pb-16">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#EAF7ED]/60 to-[#F8F9F8] pt-12 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="h-8 w-48 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-14 w-96 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-5 w-80 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-12 w-48 bg-gray-200 rounded-xl animate-pulse mt-4" />
            </div>
            <div className="lg:col-span-5">
              <div className="aspect-square bg-gray-200 rounded-3xl animate-pulse" />
            </div>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-16">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EAF7ED]/60 to-[#F8F9F8] pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B5D1E]/10 text-[#0B5D1E] text-xs font-semibold tracking-wide">
              <Sparkles size={14} className="text-[#D9A441]" />
              <span>Joaillerie d'Exception · Abidjan</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.15] animate-float">
              L'élégance à <br className="hidden sm:inline" /> <span className="text-[#0B5D1E]">votre portée</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Découvrez nos bijoux soigneusement sélectionnés pour accompagner vos moments les plus précieux. Or pur, diamants certifiés et créations intemporelles.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => onNavigate('catalogue')}
                icon={<ArrowRight size={18} />}
                className="w-full sm:w-auto shadow-md"
              >
                Découvrir la collection
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onNavigate('sur-mesure')}
                className="w-full sm:w-auto border-[#0B5D1E] text-[#0B5D1E] hover:bg-[#EAF7ED]"
              >
                Créer sur-mesure
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-200/60 max-w-lg mx-auto lg:mx-0">
              <div>
                <p className="font-serif text-2xl font-bold text-[#0B5D1E]">100%</p>
                <p className="text-xs text-gray-500 font-medium">Or 18K Garanti</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-[#0B5D1E]">
                  {isLoadingStats ? (
                    <span className="inline-block w-10 h-6 bg-gray-200 rounded animate-pulse" />
                  ) : stats ? (
                    stats.totalCustomers > 0 ? `${Math.round(stats.totalCustomers)}+` : '0'
                  ) : '0'}
                </p>
                <p className="text-xs text-gray-500 font-medium">Clients Satisfaits</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-[#0B5D1E]">
                  {isLoadingStats ? (
                    <span className="inline-block w-10 h-6 bg-gray-200 rounded animate-pulse" />
                  ) : stats ? `${stats.totalProducts}+` : '0+'}
                </p>
                <p className="text-xs text-gray-500 font-medium">Produits</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src={featuredProduct?.images?.[0] || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80'}
                alt={featuredProduct?.name || 'Bijou Satouba Bijouterie 255'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-xs uppercase tracking-widest text-[#D9A441] font-semibold">Pièce Signature</span>
                <h3 className="font-serif text-xl font-bold">{featuredProduct?.name || 'Bague Royale Or & Diamant'}</h3>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-[#D9A441] p-0.5 shrink-0 flex items-center justify-center shadow-xs">
                <img src="/logo.jpg" alt="Satouba Bijouterie 255 Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{settings?.brand_name || 'Satouba Bijouterie 255'}</p>
                <p className="text-[10px] text-[#0B5D1E] font-medium">Moderne & de la Joaillerie</p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* CATEGORIES SECTION */}
      {categories.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Nos Univers</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900">Explorez nos collections</h2>
          </div>
          <button
            onClick={() => onNavigate('catalogue')}
            className="text-sm font-semibold text-[#0B5D1E] hover:text-[#064A15] flex items-center gap-1 group"
          >
            <span>Voir tout</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: idx * 0.06 }}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onSelectCategory(cat.slug);
                onNavigate('catalogue');
              }}
              className="group cursor-pointer flex flex-col items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all text-center"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 border-2 border-[#EAF7ED] group-hover:border-[#0B5D1E] transition-colors">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-[#0B5D1E] transition-colors">
                {cat.name}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
      )}

      {/* SPECIAL OFFERS BANNER */}
      {promoProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="bg-gradient-to-r from-[#0B5D1E] to-[#064A15] rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 hidden md:block">
              <img src={promoProducts[0].images?.[0] || '/placeholder.svg'} alt="Promo" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10 max-w-xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-[#D9A441] text-white text-xs font-bold uppercase tracking-wider">
                Offre Spéciale Limitée
              </span>
              <h3 className="font-serif text-3xl font-bold">{promoProducts[0].name}</h3>
              <p className="text-emerald-100 text-sm leading-relaxed">{promoProducts[0].description}</p>
              <div className="pt-2">
                <Button
                  variant="gold"
                  onClick={() => onSelectProduct(promoProducts[0])}
                  icon={<Sparkles size={16} />}
                >
                  Découvrir l'offre
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* BEST SELLERS SECTION */}
      {bestSellers.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Selection Preferee</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900">Nos pieces incontournables</h2>
          </div>
          <button
            onClick={() => onNavigate('catalogue')}
            className="text-sm font-semibold text-[#0B5D1E] hover:text-[#064A15] flex items-center gap-1 group"
          >
            <span>Catalogue complet</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: idx * 0.08 }}
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
        </div>
      </section>
      )}

      {/* SUR-MESURE PROMO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="bg-[#EAF7ED] rounded-3xl p-8 sm:p-12 border border-[#0B5D1E]/20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-bold">Atelier de Création {settings?.brand_name || 'Satouba Bijouterie 255'}</span>
            <h3 className="font-serif text-3xl font-bold text-gray-900">Créez le bijou de vos rêves sur-mesure</h3>
            <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
              Vous avez une idée précise ou un modèle unique en tête ? Nos maîtres joailliers façonnent à la main vos bagues, alliances et colliers selon vos désirs les plus précieux.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => onNavigate('sur-mesure')}
                icon={<Sparkles size={16} />}
              >
                Démarrer mon projet sur-mesure
              </Button>
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full overflow-hidden border-4 border-white shadow-xl">
              <img
                src={bestSellers[0]?.images?.[0] || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80'}
                alt="Sur-mesure"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
