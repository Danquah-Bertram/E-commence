import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { AuthService, NotificationService, PERM, can } from '../services/dataService';
import type { AdminNotification } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, MessageSquare,
  Tag, BarChart2, Activity, ClipboardList, Shield, Settings, Bell,
  ChevronLeft, ChevronRight, Star, Lock, LogOut, X, RefreshCw, Trash2,
} from 'lucide-react';import { toast } from 'sonner';

// ── lazy-load sections ────────────────────────────────────────────────────────
import AdminOverview from '../components/admin/AdminOverview';
import AdminProducts from '../components/admin/AdminProducts';
import AdminInventory from '../components/admin/AdminInventory';
import AdminOrders from '../components/admin/AdminOrders';
import AdminCustomers from '../components/admin/AdminCustomers';
import AdminMessages from '../components/admin/AdminMessages';
import AdminPromotions from '../components/admin/AdminPromotions';
import AdminReports from '../components/admin/AdminReports';
import AdminActivity from '../components/admin/AdminActivity';
import AdminManagement from '../components/admin/AdminManagement';
import AdminSettings from '../components/admin/AdminSettings';
import AdminTrash from '../components/admin/AdminTrash';


type Section = 'overview' | 'orders' | 'products' | 'inventory' | 'customers' | 'messages' | 'promotions' | 'reports' | 'activity' | 'audit' | 'admin-management' | 'settings' | 'trash';

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType; perm?: string; superOnly?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, perm: PERM.VIEW_DASHBOARD },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, perm: PERM.VIEW_ORDERS },
  { id: 'products', label: 'Products', icon: Package, perm: PERM.VIEW_PRODUCTS },
  { id: 'inventory', label: 'Inventory', icon: Boxes, perm: PERM.VIEW_INVENTORY },
  { id: 'customers', label: 'Customers', icon: Users, perm: PERM.VIEW_CUSTOMERS },
  { id: 'messages', label: 'Messages', icon: MessageSquare, perm: PERM.VIEW_MESSAGES },
  { id: 'promotions', label: 'Promotions', icon: Tag, perm: PERM.VIEW_PROMOTIONS },
  { id: 'reports', label: 'Reports', icon: BarChart2, perm: PERM.VIEW_REPORTS },
  { id: 'activity', label: 'Activity', icon: Activity, superOnly: true },
 // { id: 'audit', label: 'Admin Audit', icon: ClipboardList, superOnly: true },
  { id: 'admin-management', label: 'Admin Management', icon: Shield, superOnly: true },
 { id: 'trash', label: 'Recycle Bin', icon: Trash2, superOnly: true },

  { id: 'settings', label: 'Settings', icon: Settings, perm: PERM.VIEW_SETTINGS },
];

export default function AdminDashboard() {
  const currentUser = AuthService.getCurrentUser();
  const isSuper = currentUser?.accessLevel === 'super';

  const [section, setSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const loadNotifs = async () => setNotifications(await NotificationService.getAll());

  useEffect(() => {
    loadNotifs();
    const iv = setInterval(loadNotifs, 10000);
    return () => clearInterval(iv);
  }, []);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.superOnly) return isSuper;
    if (!item.perm) return true;
    return can(currentUser, item.perm);
  });

  const accessBadge = () => {
    if (isSuper) return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-900 to-red-700 text-white font-medium">
        <Star className="w-3 h-3" /> Super Admin
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-900 text-white font-medium">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  };

  const handleNavClick = (id: Section) => {
    setSection(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const renderSection = () => {
    const props = { currentUser, isSuper, onNavigate: (s: Section) => setSection(s), onMessageCountChange: setMessageCount };
    switch (section) {
      case 'overview': return <AdminOverview {...props} />;
      case 'orders': return <AdminOrders {...props} />;
      case 'products': return <AdminProducts {...props} />;
      case 'inventory': return <AdminInventory {...props} />;
      case 'customers': return <AdminCustomers {...props} />;

      case 'messages': return <AdminMessages {...props} />;
      case 'promotions': return <AdminPromotions {...props} />;
      case 'reports': return <AdminReports {...props} />;
      case 'activity': return <AdminActivity {...props} showAudit={false} />;
      case 'audit': return <AdminActivity {...props} showAudit />;
      case 'admin-management': return <AdminManagement {...props} />;
      case 'trash': return <AdminTrash {...props} />;

      case 'settings': return <AdminSettings {...props} />;
      default: return null;
    }
  };

  return (
  <div
    className="flex h-screen bg-slate-50 -mt-4 -mx-4 overflow-hidden min-w-0"
    style={{ minHeight: 'calc(100vh - 64px)' }}
  >
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
    className="flex flex-col bg-slate-950 text-white shrink-0 overflow-hidden z-20 shadow-xl"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-blue-900">
          {sidebarOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center font-bold text-sm shrink-0">PK</div>
              <span className="font-bold text-sm truncate">Admin Panel</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(o => !o)} className="ml-auto p-1.5 rounded-lg hover:bg-blue-900 transition-colors shrink-0">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = section === item.id || (section === 'audit' && item.id === 'audit');
            const badge = item.id === 'messages' && messageCount > 0 ? messageCount : 0;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-lg mx-1 ${active ? 'bg-red-700 text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}
                style={{ width: sidebarOpen ? 'calc(100% - 8px)' : 'calc(100% - 8px)' }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {sidebarOpen && badge > 0 && (
                  <span className="bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none shrink-0">{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer — admin profile */}
        <div className="border-t border-blue-900 p-3">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-blue-400 truncate">{currentUser?.email}</p>
                </div>
              </div>
              {accessBadge()}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-sm mx-auto">
              {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-blue-950 capitalize">
              {NAV_ITEMS.find(n => n.id === section)?.label ?? 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-400">Prayer is the key ventures</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            {(isSuper || can(currentUser, PERM.VIEW_NOTIFICATIONS)) && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(o => !o)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-700 text-white text-xs rounded-full flex items-center justify-center leading-none">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                      <span className="font-semibold text-sm text-gray-800">Notifications</span>
                      <div className="flex gap-2">
                        {unreadNotifs > 0 && (
                          <button onClick={() => NotificationService.markAllRead().then(loadNotifs)} className="text-xs text-blue-900 hover:underline">Mark all read</button>
                        )}
                        <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-gray-400" /></button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y">
                      {notifications.length === 0
                        ? <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                        : notifications.slice(0, 20).map(n => (
                          <button
                            key={n.id}
                            onClick={() => { NotificationService.markRead(n.id).then(loadNotifs); if (n.link) { setSection(n.link as Section); setShowNotifications(false); } }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                          >
                            <p className="text-sm font-medium text-gray-900">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </button>
                        ))
                      }
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t bg-gray-50">
                        <button onClick={() => NotificationService.clear().then(() => setNotifications([]))} className="w-full text-xs text-red-700 hover:underline py-1">Clear all</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={loadNotifs} className="gap-1.5 border-blue-900 text-blue-900 hover:bg-blue-50 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            {!isSuper && (
              <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                <Lock className="w-3 h-3" /> Limited access
              </span>
            )}
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {renderSection()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
