import { memo } from 'react';
import { Home, Heart, ShoppingBag, MessageSquare, User as UserIcon  } from '../../ui/Icons';;
import { motion } from 'motion/react';

interface BottomNavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  cartCount: number;
  favoritesCount: number;
}

export const BottomNavigation = memo(function BottomNavigation({
  currentTab,
  onSelectTab,
  cartCount,
  favoritesCount
}: BottomNavigationProps) {
  const tabs = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'favoris', label: 'Favoris', icon: Heart, badge: favoritesCount },
    { id: 'panier', label: 'Panier', icon: ShoppingBag, badge: cartCount },
    { id: 'chat', label: 'Contact', icon: MessageSquare },
    { id: 'profil', label: 'Profil', icon: UserIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white/90 backdrop-blur-xl border-t border-gray-100/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.85 }}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-colors duration-200 min-w-[56px] ${
                  isActive ? 'text-[#0B5D1E]' : 'text-gray-400'
                }`}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavBg"
                    className="absolute inset-0 bg-[#EAF7ED] rounded-2xl"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <div className="relative z-10">
                  <Icon
                    size={22}
                    className={`transition-all duration-200 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`}
                  />
                  {tab.badge && tab.badge > 0 ? (
                    <motion.span
                      key={tab.badge}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2.5 bg-[#D9A441] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm"
                    >
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </motion.span>
                  ) : null}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium relative z-10 transition-all duration-200 ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

