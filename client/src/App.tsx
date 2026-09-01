import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { Footer } from './components/layout/Footer';
import { SearchModal } from './components/layout/SearchModal';
import { NotificationsModal } from './components/layout/NotificationsModal';
import { SplashView } from './components/auth/SplashView';
import { AuthModal } from './components/auth/AuthModal';
import { HomeView } from './components/views/HomeView';
import { CatalogueView } from './components/views/CatalogueView';
import { ProductDetailView } from './components/views/ProductDetailView';
import { FavoritesView } from './components/views/FavoritesView';
import { CartView } from './components/views/CartView';
import { OrdersView } from './components/views/OrdersView';
import { CustomView } from './components/views/CustomView';
import { RepairView } from './components/views/RepairView';
import { ProfileView } from './components/views/ProfileView';
import { ChatView } from './components/views/ChatView';
import { LegalView } from './components/views/LegalView';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { Product, Category, Cart, NotificationItem, User } from './types';
import { fetchCategories } from './lib/api/categories';
import { fetchProducts } from './lib/api/products';
import { fetchCart, addToCart } from './lib/api/cart';
import { fetchFavorites, toggleFavorite } from './lib/api/favorites';
import { fetchNotifications, markNotificationAsRead } from './lib/api/notifications';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('satouba_token');
    const savedUser = localStorage.getItem('satouba_user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);
      } catch {
        localStorage.removeItem('satouba_token');
        localStorage.removeItem('satouba_user');
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchProducts({ limit: 100 }).then((res) => setProducts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) {
      setCart({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
      setFavorites([]);
      setNotifications([]);
      return;
    }
    fetchCart().then(setCart).catch(() => {
      setCart({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
    });
    fetchFavorites().then((favs) => setFavorites(favs.map(f => f.id))).catch(() => {});
    fetchNotifications().then(setNotifications).catch(() => {});
  }, [user]);


  const handleLogin = (loggedInUser: User, _token: string, _refreshToken?: string) => {
    setUser(loggedInUser);
  };

  const refreshCart = () => {
    if (!user) return;
    fetchCart().then(setCart).catch(() => {
      setCart({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
    });
  };

  const handleLogout = async () => {
    // Revoke refresh token on server
    const token = localStorage.getItem('satouba_token');
    const refreshToken = localStorage.getItem('satouba_refresh_token');
    if (token && refreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem('satouba_token');
    localStorage.removeItem('satouba_refresh_token');
    localStorage.removeItem('satouba_user');
    setUser(null);
    setCurrentTab('home');
    setSelectedProduct(null);
  };

  const handleNavigate = (tab: string) => {
    const protectedTabs = ['panier', 'commandes', 'favoris', 'profil', 'sur-mesure', 'reparation', 'chat'];
    if (protectedTabs.includes(tab) && !user) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedProduct(null);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentTab('produit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = async (productId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await toggleFavorite(productId);
      setFavorites(res.favorites);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToCart = async (product: Product, quantity = 1, size?: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const updatedCart = await addToCart(product.id, quantity, size);
      setCart(updatedCart);
    } catch (e) {
      // Error handled by ProductDetailView
    }
  };

  const handleOpenCart = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    handleNavigate('panier');
  };

  const handleOpenNotifications = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsNotificationsOpen(true);
  };

  if (showSplash) {
    return <SplashView onComplete={() => setShowSplash(false)} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ToastProvider>
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-[#F8F9F8] text-[#111827]">

      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={handleOpenNotifications}
        onOpenCart={handleOpenCart}
        cartItemCount={cart.items.reduce((acc, i) => acc + i.quantity, 0)}
        unreadNotificationsCount={unreadCount}
        currentTab={currentTab}
        onSelectTab={handleNavigate}
      />

      <main className="flex-1 pb-24 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          >
            {currentTab === 'home' && (
              <HomeView
                categories={categories}
                products={products}
                onSelectCategory={(slug) => {
                  setSelectedCategorySlug(slug);
                  setCurrentTab('catalogue');
                }}
                onSelectProduct={handleSelectProduct}
                onToggleFavorite={handleToggleFavorite}
                favorites={favorites}
                onAddToCart={(p) => handleAddToCart(p, 1)}
                onNavigate={handleNavigate}
              />
            )}

            {currentTab === 'catalogue' && (
              <CatalogueView
                categories={categories}
                selectedCategorySlug={selectedCategorySlug}
                onSelectProduct={handleSelectProduct}
                onToggleFavorite={handleToggleFavorite}
                favorites={favorites}
                onAddToCart={(p) => handleAddToCart(p, 1)}
              />
            )}

            {currentTab === 'produit' && selectedProduct && (
              <ProductDetailView
                product={selectedProduct}
                onBack={() => handleNavigate('catalogue')}
                onAddToCart={handleAddToCart}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.includes(selectedProduct.id)}
              />
            )}

            {currentTab === 'favoris' && (
              <FavoritesView
                onSelectProduct={handleSelectProduct}
                onToggleFavorite={handleToggleFavorite}
                favorites={favorites}
                onAddToCart={(p) => handleAddToCart(p, 1)}
                onNavigate={handleNavigate}
              />
            )}

            {currentTab === 'panier' && (
              <CartView
                cart={cart}
                onUpdateCart={setCart}
                onNavigate={handleNavigate}
                onRefreshCart={refreshCart}
              />
            )}

            {currentTab === 'commandes' && (
              <OrdersView />
            )}

            {currentTab === 'sur-mesure' && (
              <CustomView />
            )}

            {currentTab === 'reparation' && (
              <RepairView />
            )}

            {currentTab === 'profil' && (
              <ProfileView onNavigate={handleNavigate} onLogout={handleLogout} onProfileUpdate={(u) => setUser(u)} />
            )}

            {currentTab === 'chat' && (
              <ChatView />
            )}

            {currentTab === 'cgv' && (
              <LegalView type="cgv" />
            )}

            {currentTab === 'confidentialite' && (
              <LegalView type="confidentialite" />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer onNavigate={handleNavigate} />

      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        cartCount={cart.items.reduce((acc, i) => acc + i.quantity, 0)}
        favoritesCount={favorites.length}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(p) => {
          handleSelectProduct(p);
          setIsSearchOpen(false);
        }}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={async (id) => {
          await markNotificationAsRead(id);
          setNotifications(await fetchNotifications());
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
      />

    </div>
    </ErrorBoundary>
    </ToastProvider>
  );
}
