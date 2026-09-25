import { useState, useEffect } from 'react';
import { User, Order, OrderStatus } from '../../types';
import { OrderService, TransactionService, InvoiceService, AdminAuditService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ShoppingCart, Trash2, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/invoice';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

const STATUS_PIPELINE: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'completed'];
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  ready: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-700 text-white border-green-700',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function AdminOrders({ currentUser, isSuper }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterDate, setFilterDate] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesTarget, setNotesTarget] = useState<Order | null>(null);
  const [notesText, setNotesText] = useState('');

  const canChangeStatus = isSuper || can(currentUser, PERM.CHANGE_ORDER_STATUS);
  const canDelete = isSuper || can(currentUser, PERM.EDIT_ORDERS);
  const canCancel = isSuper || can(currentUser, PERM.CANCEL_ORDERS);
  const canEditNotes = isSuper || can(currentUser, PERM.EDIT_ORDERS);

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilters(); }, [orders, search, statusFilter, sortOrder, filterDate]);

  const load = async () => {
    setLoading(true);
    const all = await OrderService.getAll();
    setOrders(all);
    setLoading(false);
  };

  const applyFilters = () => {
    let list = [...orders];
    if (search) list = list.filter(o => o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerEmail.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') list = list.filter(o => (o.orderStatus ?? 'pending') === statusFilter);
    if (filterDate) list = list.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === filterDate);
    list.sort((a, b) => { const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); return sortOrder === 'desc' ? -d : d; });
    setFiltered(list);
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    await OrderService.update(order.id, { orderStatus: status });
    AdminAuditService.log('Order Status Changed', `Order #${order.id.slice(-8)}: ${order.orderStatus ?? 'pending'} → ${status}`);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, orderStatus: status } : o));
    toast.success(`Order status → ${status}`);
  };

  const saveNotes = async () => {
    if (!notesTarget) return;
    await OrderService.update(notesTarget.id, { notes: notesText });
    AdminAuditService.log('Order Notes Updated', `Order #${notesTarget.id.slice(-8)}`);
    setOrders(prev => prev.map(o => o.id === notesTarget.id ? { ...o, notes: notesText } : o));
    setNotesTarget(null); toast.success('Notes saved');
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order and all its records?')) return;
    await OrderService.delete(id);
    TransactionService.deleteByOrderId(id);
    InvoiceService.deleteByOrderId(id);
    AdminAuditService.log('Order Deleted', `Order #${id.slice(-8)}`);
    setOrders(prev => prev.filter(o => o.id !== id));
    toast.success('Order deleted');
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {[...STATUS_PIPELINE, 'cancelled', 'refunded'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-[150px]" />
            {filterDate && <Button variant="ghost" size="sm" onClick={() => setFilterDate('')} className="text-red-700">Clear date</Button>}
            <Select value={sortOrder} onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="desc">Newest First</SelectItem><SelectItem value="asc">Oldest First</SelectItem></SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</Badge>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0
        ? <Card><CardContent className="p-12 text-center text-gray-400"><ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-200" />No orders match your filters</CardContent></Card>
        : (
          <div className="space-y-3">
            {filtered.map(order => {
              const isOpen = expanded === order.id;
              const statusIdx = STATUS_PIPELINE.indexOf(order.orderStatus as OrderStatus);
              return (
                <Card key={order.id} className={`transition-all ${order.orderStatus === 'cancelled' ? 'border-red-200' : order.orderStatus === 'completed' ? 'border-green-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">#{order.id.slice(-8)}</span>
                          <Badge className={`text-xs border ${STATUS_COLORS[order.orderStatus ?? 'pending']}`}>{order.orderStatus ?? 'pending'}</Badge>
                          <Badge className={`text-xs ${order.paymentStatus === 'paid' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{order.paymentStatus}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{order.customerName} · {order.customerEmail}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>
                        <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xl font-bold text-blue-900">{formatCurrency(order.totalAmount)}</span>
                        <button onClick={() => setExpanded(isOpen ? null : order.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        {/* Items */}
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm"><span className="text-gray-600">{item.productName} × {item.quantity}</span><span className="font-medium">{formatCurrency(item.price * item.quantity)}</span></div>
                          ))}
                        </div>

                        {/* Status pipeline */}
                        {canChangeStatus && !['cancelled', 'refunded'].includes(order.orderStatus ?? '') && (
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500">ORDER STATUS PIPELINE</Label>
                            <div className="flex flex-wrap gap-1">
                              {STATUS_PIPELINE.map((s, idx) => (
                                <button key={s} onClick={() => updateStatus(order, s)}
                                  className={`px-2.5 py-1 text-xs rounded-lg border capitalize transition-all ${(order.orderStatus ?? 'pending') === s ? STATUS_COLORS[s] + ' font-bold' : idx <= statusIdx ? 'bg-gray-100 text-gray-400 line-through' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'}`}
                                >{s}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cancel / Refund */}
                        <div className="flex gap-2 flex-wrap">
                          {canCancel && !['cancelled', 'completed', 'refunded'].includes(order.orderStatus ?? 'pending') && (
                            <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 text-xs" onClick={() => updateStatus(order, 'cancelled')}>Cancel Order</Button>
                          )}
                          {(isSuper || can(currentUser, PERM.PROCESS_REFUNDS)) && order.orderStatus !== 'refunded' && (
                            <Button size="sm" variant="outline" className="text-orange-700 border-orange-200 hover:bg-orange-50 text-xs" onClick={() => updateStatus(order, 'refunded')}>Mark Refunded</Button>
                          )}
                          {canEditNotes && (
                            <Button size="sm" variant="outline" className="border-blue-200 text-blue-900 hover:bg-blue-50 text-xs" onClick={() => { setNotesTarget(order); setNotesText(order.notes ?? ''); }}>
                              {order.notes ? 'Edit Notes' : 'Add Notes'}
                            </Button>
                          )}
                          {canDelete && (
                            <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 text-xs ml-auto" onClick={() => deleteOrder(order.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                          )}
                        </div>

                        {order.notes && <p className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-2"><span className="font-medium">Notes:</span> {order.notes}</p>}
                        <p className="text-xs text-gray-400">Ref: {order.paystackReference}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {/* Notes dialog */}
      {notesTarget && (
        <Dialog open onOpenChange={() => setNotesTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Internal Order Notes</DialogTitle><DialogDescription>Notes are only visible to admins.</DialogDescription></DialogHeader>
            <Textarea rows={4} value={notesText} onChange={e => setNotesText(e.target.value)} placeholder="Add delivery notes, special instructions…" />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setNotesTarget(null)}>Cancel</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={saveNotes}>Save Notes</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
