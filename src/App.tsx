import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { Footer } from './components/layout/Footer';
import { SearchModal } from './components/layout/SearchModal';
import { NotificationsModal } from './components/layout/NotificationsModal';
import { SplashView } from './components/auth/SplashView';
import { AuthModal } from './components/auth/AuthModal';
import { GerantLogin } from './components/auth/GerantLogin';
import { HomeView } from './components/views/HomeView';
import { CatalogueView } from './components/views/CatalogueView';
import { ProductDetailView } from './components/views/ProductDetailView';
import { FavoritesView } from './components/views/FavoritesView';
import { CartView } from './components/views/CartView';
import { CheckoutView } from './components/views/CheckoutView';
import { OrdersView } from './components/views/OrdersView';
import { CustomView } from './components/views/CustomView';
import { RepairView } from './components/views/RepairView';
import { ProfileView } from './components/views/ProfileView';
import { CouponsView } from './components/views/CouponsView';
import { ChatView } from './components/views/ChatView';
import { LegalView } from './components/views/LegalView';
import { GerantDashboard } from './components/gerant/GerantDashboard';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { Product, Category, Cart, NotificationItem, User } from './types';
import { fetchCategories } from './lib/api/categories';
import { fetchProducts } from './lib/api/products';
import { fetchCart, addToCart } from './lib/api/cart';
import { fetchFavorites, toggleFavorite } from './lib/api/favorites';
import { fetchNotifications, markNotificationAsRead } from './lib/api/notifications';
import { registerPushNotifications, unregisterPushNotifications, setupForegroundHandler, clearForegroundHandler } from './lib/notifications';

// Check if URL is /gerant
function isGerantRoute(): boolean {
  return window.location.pathname === '/gerant';
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isGerant, setIsGerant] = useState(isGerantRoute());

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0, shippingFee: 0, discount: 0, total: 0 });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [checkoutItemIds, setCheckoutItemIds] = useState<string[] | undefined>(undefined);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Listen for URL changes
  useEffect(() => {
    const handlePopState = () => {
      setIsGerant(isGerantRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Gestion du retour paiement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('orderId');
    if (payment === 'success' && orderId) {
      setCurrentTab('checkout');
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);
        // If admin and on /gerant, keep gerant view
        if (parsedUser.role === 'ADMIN' && isGerantRoute()) {
          setIsGerant(true);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Load public data (categories, products)
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchProducts({ limit: 100 }).then((res) => setProducts(res.data)).catch(console.error);
  }, []);

  // Load user-specific data when logged in
  useEffect(() => {
    if (!user) {
      setCart({ items: [], subtotal: 0, shippingFee: 0, discount: 0, total: 0 });
      setFavorites([]);
      setNotifications([]);
      return;
    }
    fetchCart().then(setCart).catch(console.error);
    fetchFavorites().then((favs) => setFavorites(favs.map(f => f.id))).catch(console.error);
    fetchNotifications().then(setNotifications).catch(console.error);
  }, [user]);

  // Register/unregister push notifications based on auth state
  useEffect(() => {
    if (user) {
      registerPushNotifications(user.id);
      setupForegroundHandler((payload) => {
        console.log('Push notification received:', payload);
        // Refresh notifications
        fetchNotifications().then(setNotifications).catch(console.error);
        // Could also show a toast here
      });
    } else {
      clearForegroundHandler();
    }
    return () => {
      clearForegroundHandler();
    };
  }, [user]);

  const handleLogin = (loggedInUser: User, _token: string) => {
    setUser(loggedInUser);
    fetchCart().then(setCart).catch(console.error);
    fetchFavorites().then((favs) => setFavorites(favs.map(f => f.id))).catch(console.error);
    fetchNotifications().then(setNotifications).catch(console.error);
  };

  const handleGerantLogin = (loggedInUser: User, _token: string) => {
    setUser(loggedInUser);
    setIsGerant(true);
  };

  const handleLogout = async () => {
    if (user) {
      await unregisterPushNotifications(user.id);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsGerant(false);
    setCurrentTab('home');
    setSelectedProduct(null);
    window.history.pushState({}, '', '/');
  };

  const handleNavigate = (tab: string) => {
    const protectedTabs = ['panier', 'checkout', 'commandes', 'favoris', 'profil', 'coupons', 'sur-mesure', 'reparation', 'chat'];
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
      setCurrentTab('panier');
    } catch (e) {
      console.error(e);
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

  // === GERANT FLOW ===
  if (isGerant) {
    // Show gerant login if not logged in as admin
    if (!user || user.role !== 'ADMIN') {
      return <GerantLogin onLogin={handleGerantLogin} />;
    }
    // Show gerant dashboard
    return <GerantDashboard onSwitchToClient={() => {
      setIsGerant(false);
      window.history.pushState({}, '', '/');
    }} />;
  }

  // === CLIENT FLOW ===
  // Splash screen
  if (showSplash) {
    return <SplashView onComplete={() => setShowSplash(false)} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ToastProvider>
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-[#F8F9F8] text-[#111827]">
      
      {/* Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={handleOpenNotifications}
        onOpenCart={handleOpenCart}
        cartItemCount={cart.items.reduce((acc, i) => acc + i.quantity, 0)}
        unreadNotificationsCount={unreadCount}
        currentTab={currentTab}
        onSelectTab={handleNavigate}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-12">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
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
              onProceedToCheckout={(ids) => {
                setCheckoutItemIds(ids);
                handleNavigate('checkout');
              }}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'checkout' && (
            <CheckoutView
              cart={cart}
              selectedCartItemIds={checkoutItemIds}
              onOrderSuccess={() => {
                // Refresh cart (paid items removed server-side)
                fetchCart().then(setCart).catch(console.error);
                setCheckoutItemIds(undefined);
                handleNavigate('commandes');
              }}
              onBack={() => handleNavigate('panier')}
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

          {currentTab === 'coupons' && (
            <CouponsView />
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
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Bottom Mobile Navigation Bar */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        cartCount={cart.items.reduce((acc, i) => acc + i.quantity, 0)}
        favoritesCount={favorites.length}
      />

      {/* Modals */}
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
