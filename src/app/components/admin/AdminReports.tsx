import { useState, useEffect } from 'react';
import { User } from '../../types';
import { OrderService, TransactionService, UserService, ProductService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BarChart2, TrendingUp, DollarSign, ShoppingCart, Users, Package, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { formatCurrency } from '../../utils/invoice';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

export default function AdminReports({ currentUser, isSuper }: Props) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<{ daily: any[]; summary: any }>({ daily: [], summary: {} });
  const [loading, setLoading] = useState(false);

  const canGenerate = isSuper || can(currentUser, PERM.GENERATE_REPORTS);
  const canExport = isSuper || can(currentUser, PERM.EXPORT_REPORTS);

  useEffect(() => { if (isSuper || can(currentUser, PERM.VIEW_REPORTS)) generate(); }, []);

  const generate = async () => {
    if (!canGenerate && !(isSuper)) return;
    setLoading(true);
    try {
      const [orders, txns, customers, products] = await Promise.all([OrderService.getAll(), TransactionService.getAll(), UserService.getCustomers(), ProductService.getAll()]);
      const fromDate = new Date(from + 'T00:00:00');
      const toDate = new Date(to + 'T23:59:59');
      const filteredOrders = orders.filter(o => { const d = new Date(o.createdAt); return d >= fromDate && d <= toDate; });
      const filteredTxns = txns.filter(t => { const d = new Date(t.createdAt); return d >= fromDate && d <= toDate && t.status === 'success'; });
      const filteredCustomers = customers.filter(c => { const d = new Date(c.createdAt); return d >= fromDate && d <= toDate; });

      // Build daily data
      const days: Record<string, { label: string; revenue: number; orders: number }> = {};
      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= Math.min(diffDays, 365); i++) {
        const d = new Date(fromDate); d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        days[key] = { label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), revenue: 0, orders: 0 };
      }
      filteredTxns.forEach(t => { const key = new Date(t.createdAt).toISOString().split('T')[0]; if (days[key]) { days[key].revenue += t.amount; } });
      filteredOrders.forEach(o => { const key = new Date(o.createdAt).toISOString().split('T')[0]; if (days[key]) { days[key].orders++; } });

      const totalRevenue = filteredTxns.reduce((s, t) => s + t.amount, 0);
      const avgOrderValue = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;

      // Product performance
      const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
      filteredOrders.forEach(o => o.items.forEach(item => {
        if (!prodMap[item.productId]) prodMap[item.productId] = { name: item.productName, units: 0, revenue: 0 };
        prodMap[item.productId].units += item.quantity;
        prodMap[item.productId].revenue += item.price * item.quantity;
      }));

      setData({
        daily: Object.values(days),
        summary: {
          totalRevenue, avgOrderValue,
          totalOrders: filteredOrders.length,
          newCustomers: filteredCustomers.length,
          totalProducts: products.length,
          topProducts: Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        },
      });
    } finally { setLoading(false); }
  };

  const exportCSV = () => {
    const rows = [['Date', 'Revenue (GH₵)', 'Orders'], ...data.daily.map(d => [d.label, d.revenue.toFixed(2), d.orders])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `report_${from}_to_${to}.csv`; a.click();
  };

  if (!isSuper && !can(currentUser, PERM.VIEW_REPORTS)) return <div className="text-center py-20 text-gray-400">You do not have permission to view reports.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-blue-950">Reports & Analytics</h2>
        {canExport && <Button variant="outline" className="gap-2 border-blue-900 text-blue-900 hover:bg-blue-50" onClick={exportCSV}><Download className="w-4 h-4" />Export CSV</Button>}
      </div>

      {/* Date range + generate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-[150px]" /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-[150px]" /></div>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={generate} disabled={loading || !canGenerate}>{loading ? 'Generating…' : 'Generate Report'}</Button>
          </div>
        </CardContent>
      </Card>

      {data.summary.totalRevenue !== undefined && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Revenue', value: formatCurrency(data.summary.totalRevenue ?? 0), icon: <DollarSign className="w-4 h-4" />, bg: 'bg-blue-900' },
              { label: 'Orders', value: String(data.summary.totalOrders ?? 0), icon: <ShoppingCart className="w-4 h-4" />, bg: 'bg-red-700' },
              { label: 'New Customers', value: String(data.summary.newCustomers ?? 0), icon: <Users className="w-4 h-4" />, bg: 'bg-blue-700' },
              { label: 'Avg Order', value: formatCurrency(data.summary.avgOrderValue ?? 0), icon: <TrendingUp className="w-4 h-4" />, bg: 'bg-green-700' },
            ].map(s => (
              <Card key={s.label} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className={`${s.bg} px-3 py-2 flex items-center gap-2 text-white text-xs font-medium`}>{s.icon}{s.label}</div>
                  <div className="px-3 py-2"><p className="text-xl font-bold text-gray-900">{s.value}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue chart */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-700" />Daily Revenue</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(data.daily.length / 8)} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} tickFormatter={v => v === 0 ? '0' : `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Orders chart */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-blue-900" />Daily Orders</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(data.daily.length / 8)} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                  <Tooltip formatter={(v: number) => [v, 'Orders']} />
                  <Line type="monotone" dataKey="orders" stroke="#991b1b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top products */}
          {data.summary.topProducts?.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-blue-900" />Top Products by Revenue</h3>
                <div className="space-y-2">
                  {data.summary.topProducts.map((p: any, i: number) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{p.name}</p><p className="text-xs text-gray-400">{p.units} units sold</p></div>
                      <span className="font-semibold text-blue-900 shrink-0">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
