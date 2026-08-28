import { Search, Bell, ShoppingBag, User } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenCart: () => void;
  cartItemCount: number;
  unreadNotificationsCount: number;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export function Header({
  onOpenSearch,
  onOpenNotifications,
  onOpenCart,
  cartItemCount,
  unreadNotificationsCount,
  currentTab,
  onSelectTab
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs overflow-hidden border border-[#D9A441]/50 p-0.5 group-hover:border-[#0B5D1E] group-hover:shadow-md transition-all duration-300">
            <img src="/logo.jpg" alt="SaTouba Bijouterie" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <span className="font-serif text-lg font-bold tracking-tight text-[#0B5D1E] block leading-none">
              SaTouba
            </span>
            <span className="text-[10px] tracking-widest uppercase text-gray-500 font-medium">
              Bijouterie
            </span>
          </div>
        </motion.div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'home', label: 'Accueil' },
            { id: 'catalogue', label: 'Catalogue' },
            { id: 'sur-mesure', label: 'Sur-mesure' },
            { id: 'reparation', label: 'SAV' },
            { id: 'coupons', label: 'Offres' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                currentTab === tab.id
                  ? 'text-[#0B5D1E] bg-[#EAF7ED]'
                  : 'text-gray-600 hover:text-[#0B5D1E] hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {currentTab === tab.id && (
                <motion.div
                  layoutId="headerIndicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#0B5D1E] rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSearch}
            aria-label="Rechercher"
            className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100 hover:text-[#0B5D1E] transition-colors duration-200"
          >
            <Search size={20} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100 hover:text-[#0B5D1E] transition-colors duration-200 relative"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#D9A441] ring-2 ring-white"
              />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectTab('profil')}
            aria-label="Profil"
            className="hidden md:flex p-2.5 rounded-full text-gray-600 hover:bg-gray-100 hover:text-[#0B5D1E] transition-colors duration-200"
          >
            <User size={20} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenCart}
            aria-label="Panier"
            className="relative p-2.5 rounded-full bg-[#EAF7ED] text-[#0B5D1E] hover:bg-[#0B5D1E] hover:text-white transition-all duration-300"
          >
            <ShoppingBag size={20} />
            {cartItemCount > 0 && (
              <motion.span
                key={cartItemCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-[#D9A441] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
              >
                {cartItemCount}
              </motion.span>
            )}
          </motion.button>
        </div>

      </div>
    </header>
  );
}
