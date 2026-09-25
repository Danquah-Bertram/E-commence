import { useState, useEffect } from 'react';
import { User, Order, Product } from '../../types';
import { ProductService, OrderService, TransactionService, UserService, MessageService, PresenceService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { DollarSign, ShoppingCart, Package, Users, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/invoice';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

export default function AdminOverview({ currentUser, isSuper, onNavigate, onMessageCountChange }: Props) {
  const [stats, setStats] = useState({ revenue: 0, todayRevenue: 0, totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalCustomers: 0, totalProducts: 0, lowStock: 0, outOfStock: 0, unreadMessages: 0 });
  const [chartData, setChartData] = useState<{ label: string; revenue: number; orders: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; unitsSold: number; revenue: number }[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [chartPeriod]);

  const load = async () => {
    setLoading(true);
    try {
      const [orders, txns, products, customers, messages] = await Promise.all([
        OrderService.getAll(), TransactionService.getAll(), ProductService.getAll(),
        UserService.getCustomers(), MessageService.getAll(),
      ]);
      const online = PresenceService.getOnline();
      setOnlineCount(online.length);
      const unread = messages.filter(m => !m.read).length;
      onMessageCountChange?.(unread);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const paid = txns.filter(t => t.status === 'success');
      const todayPaid = paid.filter(t => new Date(t.createdAt) >= todayStart);
      const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5)).length;
      const outOfStock = products.filter(p => p.stock === 0).length;
      setStats({
        revenue: paid.reduce((s, t) => s + t.amount, 0),
        todayRevenue: todayPaid.reduce((s, t) => s + t.amount, 0),
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => !o.orderStatus || o.orderStatus === 'pending').length,
        completedOrders: orders.filter(o => o.orderStatus === 'completed').length,
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStock, outOfStock,
        unreadMessages: unread,
      });
      setRecentOrders([...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));

      // Top products by units sold
      const salesMap: Record<string, { name: string; units: number; revenue: number }> = {};
      orders.forEach(o => o.items.forEach(item => {
        if (!salesMap[item.productId]) salesMap[item.productId] = { name: item.productName, units: 0, revenue: 0 };
        salesMap[item.productId].units += item.quantity;
        salesMap[item.productId].revenue += item.price * item.quantity;
      }));
      setTopProducts(Object.values(salesMap).sort((a, b) => b.units - a.units).slice(0, 5).map(p => ({ name: p.name, unitsSold: p.units, revenue: p.revenue })));

      // Chart data
      buildChart(paid, chartPeriod);
    } finally { setLoading(false); }
  };

  const buildChart = (paid: any[], period: string) => {
    const now = new Date();
    const data: { label: string; revenue: number; orders: number }[] = [];
    if (period === 'today') {
      for (let h = 0; h < 24; h++) {
        const label = `${h.toString().padStart(2, '0')}:00`;
        const inHour = paid.filter(t => { const d = new Date(t.createdAt); return d.getDate() === now.getDate() && d.getHours() === h; });
        data.push({ label, revenue: inHour.reduce((s: number, t: any) => s + t.amount, 0), orders: inHour.length });
      }
    } else if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
        const inDay = paid.filter(t => { const td = new Date(t.createdAt); return td.toDateString() === d.toDateString(); });
        data.push({ label, revenue: inDay.reduce((s: number, t: any) => s + t.amount, 0), orders: inDay.length });
      }
    } else if (period === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const inDay = paid.filter(t => { const td = new Date(t.createdAt); return td.getFullYear() === now.getFullYear() && td.getMonth() === now.getMonth() && td.getDate() === d; });
        data.push({ label: String(d), revenue: inDay.reduce((s: number, t: any) => s + t.amount, 0), orders: inDay.length });
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((label, m) => {
        const inMonth = paid.filter(t => { const td = new Date(t.createdAt); return td.getFullYear() === now.getFullYear() && td.getMonth() === m; });
        data.push({ label, revenue: inMonth.reduce((s: number, t: any) => s + t.amount, 0), orders: inMonth.length });
      });
    }
    setChartData(data);
  };

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(stats.revenue), sub: `Today: ${formatCurrency(stats.todayRevenue)}`, icon: <DollarSign className="w-5 h-5 text-white" />, bg: 'bg-blue-900', perm: PERM.VIEW_ANALYTICS },
    { label: 'Total Orders', value: String(stats.totalOrders), sub: `Pending: ${stats.pendingOrders}`, icon: <ShoppingCart className="w-5 h-5 text-white" />, bg: 'bg-red-700', perm: PERM.VIEW_ORDERS },
    { label: 'Products', value: String(stats.totalProducts), sub: `Low: ${stats.lowStock} · Out: ${stats.outOfStock}`, icon: <Package className="w-5 h-5 text-white" />, bg: 'bg-blue-800', perm: PERM.VIEW_PRODUCTS },
    { label: 'Customers', value: String(stats.totalCustomers), sub: `Online: ${onlineCount}`, icon: <Users className="w-5 h-5 text-white" />, bg: 'bg-blue-700', perm: PERM.VIEW_CUSTOMERS },
    { label: 'Messages', value: String(stats.unreadMessages), sub: 'Unread', icon: <MessageSquare className="w-5 h-5 text-white" />, bg: 'bg-red-800', perm: PERM.VIEW_MESSAGES },
    { label: 'Completed Orders', value: String(stats.completedOrders), sub: 'All time', icon: <CheckCircle className="w-5 h-5 text-white" />, bg: 'bg-green-700', perm: PERM.VIEW_ORDERS },
  ];

  const visibleStats = statCards.filter(s => isSuper || can(currentUser, s.perm));

  const orderStatusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800',
    ready: 'bg-cyan-100 text-cyan-800', delivered: 'bg-green-100 text-green-800', completed: 'bg-green-700 text-white',
    cancelled: 'bg-red-100 text-red-800', refunded: 'bg-orange-100 text-orange-800',
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {visibleStats.map(s => (
          <Card key={s.label} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className={`${s.bg} px-3 py-2 flex items-center gap-2`}>{s.icon}<span className="text-white text-xs font-medium truncate">{s.label}</span></div>
              <div className="px-3 py-2">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {(isSuper || can(currentUser, PERM.VIEW_ANALYTICS)) && (
        <Card>
          <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
  <h2 className="font-semibold text-blue-950 flex items-center gap-2">
    <TrendingUp className="w-4 h-4 text-red-700" /> Sales Overview
  </h2>

  <div className="flex items-center gap-2 flex-wrap">
  {currentUser?.role === "admin" && currentUser?.accessLevel === "super" && (
      <button
        type="button"
        onClick={async () => {
          const confirmed = window.confirm(
            "Delete all successful revenue transactions?\n\nThis will permanently remove the revenue records used by the Revenue dashboard. Orders, customers, products, cart, wishlist, and other data will not be deleted."
          );

          if (!confirmed) return;

          try {
            const result = await TransactionService.deleteRevenue();

            window.alert(
              `Revenue deleted successfully. ${result.deleted} transaction${result.deleted === 1 ? "" : "s"} removed.`
            );

            await load();
          } catch (error: any) {
            window.alert(
              error?.message || "Failed to delete revenue."
            );
          }
        }}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 transition-colors"
      >
        Delete Revenue
      </button>
    )}

    <div className="flex gap-1">
      {(['today', 'week', 'month', 'year'] as const).map(p => (
        <button
          key={p}
          onClick={() => setChartPeriod(p)}
          className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-colors ${
            chartPeriod === p
              ? 'bg-blue-900 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  </div>
</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart key={chartPeriod} data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={v => v === 0 ? '0' : `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#1e3a8a" strokeWidth={2} fill="#1e3a8a" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        {(isSuper || can(currentUser, PERM.VIEW_ORDERS)) && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-blue-950">Recent Orders</h2>
                <button onClick={() => onNavigate('orders')} className="text-xs text-blue-900 hover:underline">View all →</button>
              </div>
              {recentOrders.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
                : (
                  <div className="space-y-2">
                    {recentOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium text-gray-900">#{o.id.slice(-6)}</span>
                          <span className="text-gray-400 ml-2 text-xs">{o.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-900">{formatCurrency(o.totalAmount)}</span>
                          <Badge className={`text-xs ${orderStatusColor[o.orderStatus ?? 'pending'] ?? 'bg-gray-100'}`}>
                            {o.orderStatus ?? 'pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Top Products */}
        {(isSuper || can(currentUser, PERM.VIEW_PRODUCTS)) && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-blue-950">Top Products</h2>
                <button onClick={() => onNavigate('products')} className="text-xs text-blue-900 hover:underline">View all →</button>
              </div>
              {topProducts.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">No sales data yet</p>
                : (
                  <div className="space-y-2">
                    {topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.unitsSold} units sold</p>
                        </div>
                        <span className="font-semibold text-blue-900 text-sm shrink-0">{formatCurrency(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alerts */}
      {(isSuper || can(currentUser, PERM.VIEW_INVENTORY)) && (stats.lowStock > 0 || stats.outOfStock > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Stock Alerts</p>
              <p className="text-xs text-amber-700">{stats.outOfStock > 0 && `${stats.outOfStock} product${stats.outOfStock !== 1 ? 's' : ''} out of stock · `}{stats.lowStock > 0 && `${stats.lowStock} product${stats.lowStock !== 1 ? 's' : ''} running low`}</p>
            </div>
            <button onClick={() => onNavigate('inventory')} className="ml-auto text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">View Inventory</button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
