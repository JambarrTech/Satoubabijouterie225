import { useState, useEffect } from 'react';
import { Search, X, Sparkles, ArrowRight  } from '../../ui/Icons';;
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { fetchProducts } from '../../lib/api/products';
import { fetchCategories } from '../../lib/api/categories';
import { Price } from '../ui/Price';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export function SearchModal({ isOpen, onClose, onSelectProduct }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    fetchCategories()
      .then(cats => setSuggestions(cats.map((c: any) => c.name)))
      .catch(() => setSuggestions([]));
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await fetchProducts({ search: query });
        setResults(data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white px-4 py-6 shadow-xl border-b border-gray-100"
          >
            <div className="max-w-3xl mx-auto flex items-center gap-4">
              <Search size={22} className="text-[#0B5D1E]" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une bague, collier, or 18K..."
                className="w-full text-lg text-gray-950 placeholder-gray-400 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X size={22} />
              </button>
            </div>
          </motion.div>

          <div className="flex-1 max-w-3xl w-full mx-auto p-4 overflow-y-auto">
            {!query.trim() ? (
              <div className="text-center py-12 text-white/80">
                <Sparkles size={36} className="mx-auto mb-3 text-[#D9A441]" />
                <p className="text-sm font-medium">Tapez votre recherche pour découvrir nos bijoux d'exception</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {suggestions.map((term, idx) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 20 }}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1 rounded-full bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12 text-white">
                <div className="w-6 h-6 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Recherche en cours...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-white/80">
                <p className="text-sm">Aucun bijou ne correspond à "{query}"</p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                className="space-y-3"
              >
                <p className="text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
                  {results.length} resultat{results.length > 1 ? 's' : ''} trouve{results.length > 1 ? 's' : ''}
                </p>
                {results.map((product) => (
                  <motion.div
                    key={product.id}
                    variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className="flex items-center gap-4 p-3 bg-white/95 rounded-xl hover:bg-white transition-colors cursor-pointer shadow-sm group"
                  >
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">{product.material || 'Bijou Satouba Bijouterie 255'}</span>
                      <h4 className="font-serif font-medium text-gray-900 text-sm group-hover:text-[#0B5D1E] transition-colors">
                        {product.name}
                      </h4>
                      <Price amount={product.price} size="sm" />
                    </div>
                    <ArrowRight size={18} className="text-gray-400 group-hover:text-[#0B5D1E] transition-colors" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

