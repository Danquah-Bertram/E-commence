import {
  ShoppingCart,
  Heart,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { CartService, BusinessSettingsService } from '../services/dataService';
import { User } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface NavbarProps {
  currentUser: User | null;
  onNavigate: (
    page:
      | 'home'
      | 'products'
      | 'cart'
      | 'wishlist'
      | 'orders'
      | 'admin'
      | 'login'
      | 'register'
      | 'profile'
  ) => void;
  onLogout: () => void;
}

export default function Navbar({
  currentUser,
  onNavigate,
  onLogout,
}: NavbarProps) {
  const [cartCount, setCartCount] = useState(0);
 const [bizName, setBizName] = useState('Prayer is the Key Ventures');
const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
   BusinessSettingsService.get()
  .then((s) => {
    setBizName(s.name || 'Prayer is the Key Ventures');
    setLogoUrl(s.logoUrl || '');
  })
  .catch(() => {});

    const update = async () => {
      try {
        const cart = await CartService.getAll();
        setCartCount(cart.reduce((s, i) => s + i.quantity, 0));
      } catch {
        // Network unavailable — keep existing cart count
      }
    };

    update();

    const interval = setInterval(update, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="bg-blue-950 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 min-w-0">

          {/* Logo + Navigation */}
          <div className="flex items-center gap-4 sm:gap-8 min-w-0">
         {/* Logo + Business Name */}
<button
  onClick={() => onNavigate('home')}
  className="flex items-center gap-2.5 group shrink-0"
>
  {logoUrl ? (
    <img
      src={logoUrl}
      alt={`${bizName} logo`}
      className="w-9 h-9 rounded-lg object-contain bg-white shadow-md"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  ) : (
    <div className="w-9 h-9 bg-red-700 rounded-lg flex items-center justify-center shadow-md">
      <span className="text-white text-sm font-bold tracking-tight">
        PK
      </span>
    </div>
  )}

  <span className="text-white font-semibold text-lg leading-tight hidden sm:block">
    {bizName}
  </span>
</button>






            {/* Navigation */}
        <div className="flex items-center gap-1 mr-11 sm:mr-10">
              <Button
                variant="ghost"
                onClick={() => onNavigate('home')}
                className="text-blue-100 hover:text-white hover:bg-blue-900 transition-colors"
              >
                Home
              </Button>

              <Button
                variant="ghost"
                onClick={() => onNavigate('products')}
                className="hidden sm:inline-flex text-blue-100 hover:text-white hover:bg-blue-900 transition-colors"
              >
                Products
              </Button>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">

            {/* Admin */}
            {currentUser?.role === 'admin' && (
              <Button
                size="sm"
                onClick={() => onNavigate('admin')}
                className="bg-red-700 hover:bg-red-600 text-white border-0 gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}

            {/* My Orders */}
            {currentUser?.role !== 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('orders')}
                className="hidden sm:flex text-blue-100 hover:text-white hover:bg-blue-900"
              >
                My Orders
              </Button>
            )}

          {/* Profile */}
{currentUser && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onNavigate('profile')}
    className="text-blue-100 hover:text-white hover:bg-blue-900 px-2 sm:px-3"
    aria-label="Profile"
  >
    <Settings className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">Profile</span>
  </Button>
)}
{/* Wishlist — logged-in customers only */}
{currentUser && currentUser.role !== 'admin' && (
  <motion.button
    onClick={() => onNavigate('wishlist')}
    className="relative p-2 rounded-lg text-blue-100 hover:text-white hover:bg-blue-900 transition-colors"
    whileTap={{ scale: 0.9 }}
    aria-label="Wishlist"
  >
    <Heart className="w-5 h-5" />
  </motion.button>
)}
            {/* Cart */}
            {currentUser?.role !== 'admin' && (
              <motion.button
                onClick={() => onNavigate('cart')}
                className="relative p-2 rounded-lg text-blue-100 hover:text-white hover:bg-blue-900 transition-colors"
                whileTap={{ scale: 0.9 }}
                aria-label="Shopping cart"
              >
                <ShoppingCart className="w-5 h-5" />

                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-red-700 text-white text-xs border-0 px-1">
                    {cartCount}
                  </Badge>
                )}
              </motion.button>
            )}

            {/* User / Authentication */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">

                {/* User name */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-900 rounded-lg border border-blue-800">
                  <UserIcon className="w-4 h-4 text-blue-300" />

                  <span className="text-sm text-blue-100 max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                </div>

                {/* Logout */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="text-white bg-blue-900 hover:bg-red-700 hover:text-white border border-blue-800 px-2 sm:px-3 shrink-0"
                >
                  <LogOut className="w-4 h-4" />

                  <span className="hidden sm:inline ml-1">
                    Logout
                  </span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="text-blue-100 hover:text-white hover:bg-blue-900"
                >
                  Login
                </Button>

            <Button
  size="sm"
  onClick={() => onNavigate('register')}
  className="bg-red-700 hover:bg-red-600 text-white border-0 shadow-sm px-3 sm:px-4 shrink-0"
>
  Sign Up
</Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}