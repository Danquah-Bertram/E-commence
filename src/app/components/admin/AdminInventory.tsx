import { useState, useEffect } from 'react';
import { User, Product, StockHistory } from '../../types';
import { ProductService, InventoryService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Boxes, AlertTriangle, History } from 'lucide-react';
import { toast } from 'sonner';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

export default function AdminInventory({ currentUser, isSuper }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [thresholdTarget, setThresholdTarget] = useState<Product | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const [loading, setLoading] = useState(true);

  const canAdd = isSuper || can(currentUser, PERM.ADD_STOCK);
  const canAdjust = isSuper || can(currentUser, PERM.ADJUST_STOCK);
  const canViewHistory = isSuper || can(currentUser, PERM.VIEW_STOCK_HISTORY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [prods, hist] = await Promise.all([
        ProductService.getAll(),
        canViewHistory ? InventoryService.getHistory() : Promise.resolve([] as StockHistory[]),
      ]);
      setProducts(prods);
      setHistory(hist);
    } catch (e: any) { toast.error(e.message || 'Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const stockStatus = (p: Product) => {
    if (p.stock === 0) return { label: 'Out of Stock', className: 'bg-red-700 text-white' };
    if (p.stock <= (p.lowStockThreshold ?? 5)) return { label: 'Low Stock', className: 'bg-amber-100 text-amber-800' };
    return { label: 'In Stock', className: 'bg-green-100 text-green-800' };
  };

  const doAdjust = async () => {
    if (!adjustTarget) return;
    const val = parseInt(adjustValue);
    if (isNaN(val) || val === 0) { toast.error('Enter a non-zero number'); return; }
    if (!adjustReason.trim()) { toast.error('Reason required'); return; }
    try {
      await InventoryService.adjustStock(adjustTarget.id, val, adjustReason.trim());
      setProducts(prev => prev.map(p => p.id === adjustTarget.id ? { ...p, stock: Math.max(0, p.stock + val) } : p));
      if (canViewHistory) { const h = await InventoryService.getHistory(); setHistory(h); }
      setAdjustTarget(null); setAdjustValue(''); setAdjustReason('');
      toast.success(`Stock ${val > 0 ? 'added' : 'reduced'} for ${adjustTarget.name}`);
    } catch (e: any) { toast.error(e.message || 'Failed to adjust stock'); }
  };

  const setThreshold = async () => {
    if (!thresholdTarget) return;
    const val = parseInt(thresholdValue);
    if (isNaN(val) || val < 0) { toast.error('Enter a valid number'); return; }
    try {
      await InventoryService.setThreshold(thresholdTarget.id, val);
      setProducts(prev => prev.map(p => p.id === thresholdTarget.id ? { ...p, lowStockThreshold: val } : p));
      setThresholdTarget(null); setThresholdValue('');
      toast.success('Threshold updated');
    } catch (e: any) { toast.error(e.message || 'Failed to update threshold'); }
  };

  if (!isSuper && !can(currentUser, PERM.VIEW_INVENTORY)) return <div className="text-center py-20 text-gray-400">You do not have permission to view inventory.</div>;

  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5));

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
  <div className="space-y-4 min-w-0 w-full overflow-hidden">
      {/* Alerts */}
      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Stock Alerts</p>
              <p className="text-xs text-amber-700">{outOfStock.length} out of stock · {lowStock.length} low stock</p>
            </div>
          </CardContent>
        </Card>
      )}

    <div className="flex items-center justify-between min-w-0">
  <h2 className="text-xl font-semibold text-slate-900 truncate">
    Inventory ({products.length} products)
  </h2>
</div>













{/* Inventory */}
<Card className="w-full min-w-0 border-slate-200 overflow-hidden">
  <CardContent className="p-0">

    {/* DESKTOP TABLE */}
    <div className="hidden md:block w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 text-slate-500 font-medium">
              Product
            </th>
            <th className="text-center px-4 py-3 text-slate-500 font-medium">
              Stock
            </th>
            <th className="text-center px-4 py-3 text-slate-500 font-medium">
              Threshold
            </th>
            <th className="text-center px-4 py-3 text-slate-500 font-medium">
              Status
            </th>
            <th className="text-right px-4 py-3 text-slate-500 font-medium">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {products.map(p => {
            const status = stockStatus(p);
            const productHistory = history.filter(
              h => h.productId === p.id
            );

            return (
              <>
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />

                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 break-words">
                          {p.name}
                        </p>

                        {p.sku && (
                          <p className="text-xs text-slate-400 break-all">
                            SKU: {p.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-bold ${
                        p.stock === 0
                          ? 'text-red-700'
                          : p.stock <= (p.lowStockThreshold ?? 5)
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center text-slate-500">
                    {p.lowStockThreshold ?? 5}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge className={`text-xs ${status.className}`}>
                      {status.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {(canAdd || canAdjust) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-blue-200 text-blue-900 hover:bg-blue-50"
                          onClick={() => {
                            setAdjustTarget(p);
                            setAdjustValue('');
                            setAdjustReason('');
                          }}
                        >
                          Adjust
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setThresholdTarget(p);
                          setThresholdValue(
                            String(p.lowStockThreshold ?? 5)
                          );
                        }}
                      >
                        Threshold
                      </Button>

                      {canViewHistory && productHistory.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-slate-500"
                          onClick={() =>
                            setShowHistory(
                              showHistory === p.id ? null : p.id
                            )
                          }
                        >
                          <History className="w-3.5 h-3.5 mr-1" />
                          {productHistory.length}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>

                {canViewHistory && showHistory === p.id && (
                  <tr key={`${p.id}-history`}>
                    <td
                      colSpan={5}
                      className="px-4 py-3 bg-slate-50"
                    >
                      <p className="text-xs font-medium text-slate-500 mb-2">
                        Stock History
                      </p>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {productHistory.slice(0, 10).map(h => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between gap-3 text-xs text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-100"
                          >
                            <span className="min-w-0 break-words">
                              <span
                                className={`font-bold ${
                                  h.change > 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {h.change > 0 ? '+' : ''}
                                {h.change}
                              </span>

                              {' — '}
                              {h.reason}

                              <span className="text-slate-400">
                                {' '}
                                by {h.adminName}
                              </span>
                            </span>

                            <span className="text-slate-400 shrink-0">
                              {new Date(h.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>


    {/* MOBILE CARDS */}
    <div className="md:hidden divide-y divide-slate-100">
      {products.map(p => {
        const status = stockStatus(p);
        const productHistory = history.filter(
          h => h.productId === p.id
        );

        return (
          <div
            key={p.id}
            className="p-4 space-y-4"
          >

            {/* Product header */}
            <div className="flex items-start gap-3 min-w-0">
              <img
                src={p.image}
                alt={p.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 leading-snug break-words">
                  {p.name}
                </h3>

                {p.sku && (
                  <p className="text-xs text-slate-400 mt-1 break-all">
                    SKU: {p.sku}
                  </p>
                )}
              </div>

              <Badge
                className={`text-[11px] shrink-0 ${status.className}`}
              >
                {status.label}
              </Badge>
            </div>


            {/* Stock information */}
            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs text-slate-500">
                  Current Stock
                </p>

                <p
                  className={`text-xl font-bold mt-1 ${
                    p.stock === 0
                      ? 'text-red-700'
                      : p.stock <= (p.lowStockThreshold ?? 5)
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}
                >
                  {p.stock}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs text-slate-500">
                  Low Stock Threshold
                </p>

                <p className="text-xl font-bold text-slate-900 mt-1">
                  {p.lowStockThreshold ?? 5}
                </p>
              </div>

            </div>


            {/* Actions */}
            <div className="flex flex-wrap gap-2">

              {(canAdd || canAdjust) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[100px] border-blue-200 text-blue-900 hover:bg-blue-50"
                  onClick={() => {
                    setAdjustTarget(p);
                    setAdjustValue('');
                    setAdjustReason('');
                  }}
                >
                  Adjust Stock
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-w-[100px]"
                onClick={() => {
                  setThresholdTarget(p);
                  setThresholdValue(
                    String(p.lowStockThreshold ?? 5)
                  );
                }}
              >
                Threshold
              </Button>

              {canViewHistory && productHistory.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 min-w-[100px] text-slate-500"
                  onClick={() =>
                    setShowHistory(
                      showHistory === p.id ? null : p.id
                    )
                  }
                >
                  <History className="w-4 h-4 mr-1" />
                  History ({productHistory.length})
                </Button>
              )}

            </div>


            {/* Mobile stock history */}
            {canViewHistory && showHistory === p.id && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">

                <p className="text-xs font-semibold text-slate-600 mb-3">
                  Stock History
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto">

                  {productHistory.slice(0, 10).map(h => (
                    <div
                      key={h.id}
                      className="bg-white rounded-lg border border-slate-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">
                          <p
                            className={`font-bold text-sm ${
                              h.change > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {h.change > 0 ? '+' : ''}
                            {h.change}
                          </p>

                          <p className="text-xs text-slate-600 mt-1 break-words">
                            {h.reason}
                          </p>

                          <p className="text-[11px] text-slate-400 mt-1 break-words">
                            By {h.adminName}
                          </p>
                        </div>

                        <span className="text-[11px] text-slate-400 shrink-0 text-right">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>

                      </div>
                    </div>
                  ))}

                </div>
              </div>
            )}

          </div>
        );
      })}
    </div>

  </CardContent>
</Card>








      {/* Adjust dialog */}
      {adjustTarget && (
        <Dialog open onOpenChange={() => setAdjustTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Stock — {adjustTarget.name}</DialogTitle><DialogDescription>Current stock: {adjustTarget.stock}. Use positive to add, negative to reduce.</DialogDescription></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1"><Label>Change amount (e.g. +20 or -5)</Label><Input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} placeholder="+20" /></div>
              <div className="space-y-1"><Label>Reason</Label><Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Restock, damaged goods, etc." /></div>
              {adjustValue && !isNaN(parseInt(adjustValue)) && <p className="text-sm text-gray-500">New stock will be: <strong>{Math.max(0, adjustTarget.stock + parseInt(adjustValue))}</strong></p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAdjustTarget(null)}>Cancel</Button>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={doAdjust}>Apply</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Threshold dialog */}
      {thresholdTarget && (
        <Dialog open onOpenChange={() => setThresholdTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Low Stock Threshold — {thresholdTarget.name}</DialogTitle><DialogDescription>Alert when stock falls at or below this number.</DialogDescription></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1"><Label>Threshold</Label><Input type="number" min="0" value={thresholdValue} onChange={e => setThresholdValue(e.target.value)} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setThresholdTarget(null)}>Cancel</Button>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={setThreshold}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
