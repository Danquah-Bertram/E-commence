import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { initializeData, AuthService, PresenceService } from './services/dataService';
import { User } from './types';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ContactPage from './pages/ContactPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Toaster } from 'sonner';

type Page = 'home' | 'products' | 'product-detail' | 'cart' | 'wishlist' | 'checkout' | 'orders' | 'admin' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'profile' | 'contact';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
  const [adminDashboardKey, setAdminDashboardKey] = useState(0);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

useEffect(() => {
  initializeData();

  const user = AuthService.getCurrentUser();
  setCurrentUser(user);

  // 🔵 Activity tracking
  const activityEvents = [
    'click',
    'keydown',
    'scroll',
    'touchstart',
  ];

  const handleActivity = () => {
    AuthService.recordActivity();
  };

  activityEvents.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });
// 🔴 5-minute inactivity check + 1-minute warning
const sessionInterval = setInterval(() => {
  const user = AuthService.getCurrentUser();

  if (!user) {
    setShowSessionWarning(false);
    return;
  }

  const lastActivity = Number(
    localStorage.getItem('phoneaccess_last_activity') || '0'
  );

  if (!lastActivity) {
    return;
  }

  const elapsed = Date.now() - lastActivity;

  // 🟡 Show warning after 4 minutes of inactivity
  if (elapsed >= 4 * 60 * 1000 && elapsed < 5 * 60 * 1000) {
    setShowSessionWarning(true);
  }

  // 🔴 Log out after 5 minutes of inactivity
  if (elapsed >= 5 * 60 * 1000) {
    setShowSessionWarning(false);
    AuthService.logout();
    setCurrentUser(null);
    setCurrentPage('login');
  }
}, 10000);
  
  // 🟢 Heartbeat
  const heartbeatInterval = setInterval(() => {
    PresenceService.heartbeat(currentPage);
  }, 10000);

  // 🟢 Clear presence when tab closes
  const handleUnload = () => PresenceService.leave();
  window.addEventListener('beforeunload', handleUnload);

  return () => {
    clearInterval(heartbeatInterval);
    clearInterval(sessionInterval);

    activityEvents.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });

    window.removeEventListener('beforeunload', handleUnload);
  };
}, []);

  const navigateTo = (page: Page, productId?: string) => {
    setCurrentPage(page);
    if (productId) {
      setSelectedProductId(productId);
    }
    if (page === 'admin') {
      setAdminDashboardKey(prev => prev + 1);
    }
    PresenceService.heartbeat(page);
    window.scrollTo(0, 0);
  };

  const navigateToResetPassword = (token: string) => {
    setResetToken(token);
    setCurrentPage('reset-password');
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      navigateToResetPassword(token);
    }
  }, []);

  const handleLogout = () => {
    PresenceService.leave();
    AuthService.logout();
    setCurrentUser(null);
    navigateTo('home');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      navigateTo('admin');
    } else {
      navigateTo('products');
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigateTo} />;
      case 'products':
        return <ProductListPage onNavigate={navigateTo} />;
      case 'product-detail':
        return selectedProductId ? (
          <ProductDetailPage productId={selectedProductId} onNavigate={navigateTo} />
        ) : (
          <ProductListPage onNavigate={navigateTo} />
        );
      case 'cart':
  return <CartPage onNavigate={navigateTo} />;
case 'wishlist':
  return <WishlistPage onNavigate={navigateTo} />;
case 'checkout':
  return <CheckoutPage onNavigate={navigateTo} currentUser={currentUser} />;

     case 'orders':
  return currentUser ? (
    currentUser.role === 'admin' ? (
      <AdminDashboard key={adminDashboardKey} />
    ) : (
      <OrderHistoryPage
        userId={currentUser.id}
        onNavigate={navigateTo}
      />
    )
  ) : (
    <LoginPage
      onNavigate={navigateTo}
      onLogin={handleLogin}
    />
  );
      case 'admin':
        return currentUser?.role === 'admin' ? (
          <AdminDashboard key={adminDashboardKey} />
        ) : (
          <LoginPage onNavigate={navigateTo} onLogin={handleLogin} />
        );
      case 'login':
        return <LoginPage onNavigate={navigateTo} onLogin={handleLogin} />;
      case 'register':
        return <RegisterPage onNavigate={navigateTo} onLogin={handleLogin} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigateTo} />;
      case 'reset-password':
        return <ResetPasswordPage token={resetToken} onNavigate={navigateTo} />;
      case 'profile':
        return <ProfileSettingsPage onNavigate={navigateTo} />;
      case 'contact':
        return <ContactPage onNavigate={navigateTo} />;
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      {/* 🟡 Session expiry warning */}
      {showSessionWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">
              Session expiring soon
            </h2>

            <p className="mt-2 text-gray-600">
              You will be logged out in 1 minute due to inactivity.
            </p>

            <button
              onClick={() => {
                AuthService.recordActivity();
                setShowSessionWarning(false);
              }}
              className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Stay logged in
            </button>
          </div>
        </div>
      )}

      {/* 🟢 Existing App content starts here */}
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {renderPage()}
        </motion.div>
      </main>
      <Footer onContactClick={() => navigateTo('contact')} />
           <Toaster position="top-center" richColors />
    </div>
   </>
);
}