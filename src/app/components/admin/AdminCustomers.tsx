import { useState, useEffect } from 'react';
import { User, Order } from '../../types';
import { UserService, OrderService, PresenceService, AdminAuditService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Mail, Phone, Users, Ban, CheckCircle, Trash2, KeyRound, Eye, Search, ShoppingCart, ShieldPlus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/invoice';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

export default function AdminCustomers({ currentUser, isSuper }: Props) {
  const [customers, setCustomers] = useState<User[]>([]);
  const [online, setOnline] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<User | null>(null);
  const [profileTarget, setProfileTarget] = useState<User | null>(null);
  const [profileOrders, setProfileOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = isSuper || can(currentUser, PERM.VIEW_CUSTOMERS);
  const canProfile = isSuper || can(currentUser, PERM.VIEW_CUSTOMER_PROFILES);
  const canSuspend = isSuper || can(currentUser, PERM.SUSPEND_CUSTOMERS);
  const canReinstate = isSuper || can(currentUser, PERM.REINSTATE_CUSTOMERS);
  const canDelete = isSuper || can(currentUser, PERM.DELETE_CUSTOMERS);
  const canResetPW = isSuper || can(currentUser, PERM.RESET_CUSTOMER_PASSWORDS);
  const canPromote = isSuper || can(currentUser, PERM.PROMOTE_CUSTOMERS);

  useEffect(() => { if (canView) load(); }, []);

  const load = async () => {
    setLoading(true);
    const [custs] = await Promise.all([UserService.getCustomers()]);
    setCustomers(custs);
    setOnline(PresenceService.getOnline());
    setLoading(false);
  };

  const openProfile = async (c: User) => {
    setProfileTarget(c);
    const orders = await OrderService.getByUserId(c.id);
    setProfileOrders(orders);
  };

  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const isOnline = (id: string) => online.some(o => o.userId === id);
  const onlinePage = (id: string) => online.find(o => o.userId === id)?.page ?? '';

  if (!canView) return <div className="text-center py-20 text-gray-400">You do not have permission to view customers.</div>;
  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-blue-950">Customers</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-700 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{online.length} online</span>
          <Badge variant="outline">{customers.length} total</Badge>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0
        ? <Card><CardContent className="p-12 text-center text-gray-400"><Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />No customers found</CardContent></Card>
        : (
          <div className="space-y-3">
            {filtered.map(c => (
              <Card key={c.id} className={`hover:shadow-md transition-all ${c.suspended ? 'border-red-200 bg-red-50' : isOnline(c.id) ? 'border-green-200' : ''}`}>
                <CardContent className="p-4">
              <div className="flex items-start gap-4 flex-col lg:flex-row">
                   <div className="space-y-1 min-w-0 w-full lg:flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOnline(c.id) && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        <span className="font-semibold text-gray-900">{c.name}</span>
                        {c.suspended && <Badge className="bg-red-700 text-white text-xs">Suspended</Badge>}
                        {isOnline(c.id) && <Badge className="bg-green-100 text-green-800 text-xs">Online · {onlinePage(c.id).replace(/-/g, ' ')}</Badge>}
                      </div>
                     <div className="flex items-start gap-3 text-sm text-gray-500 flex-wrap min-w-0">
  <span className="flex items-start gap-1 min-w-0 max-w-full">
    <Mail className="w-3 h-3 mt-0.5 shrink-0" />
    <span className="break-all">{c.email}</span>
  </span>
  {c.phone && (
    <span className="flex items-center gap-1 min-w-0">
      <Phone className="w-3 h-3 shrink-0" />
      <span className="break-all">{c.phone}</span>
    </span>
  )}
</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Joined {new Date(c.createdAt).toLocaleDateString()}</span>
                        {c.ip && <span className="font-mono">IP: {c.ip}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap w-full lg:w-auto lg:shrink-0">
                      {canProfile && <Button size="sm" variant="outline" className="border-blue-900 text-blue-900 hover:bg-blue-50" onClick={() => openProfile(c)}><Eye className="w-3 h-3 mr-1" />Profile</Button>}
                      {canPromote && <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => setPromoteTarget(c)}><ShieldPlus className="w-3 h-3 mr-1" />Make Admin</Button>}
                      {canResetPW && <Button size="sm" variant="outline" className="border-blue-200 text-blue-900 hover:bg-blue-50" onClick={() => { setResetTarget(c); setNewPassword(''); }}><KeyRound className="w-3 h-3 mr-1" />Reset PW</Button>}
                      {c.suspended
                        ? canReinstate && <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={() => { UserService.setSuspended(c.id, false); AdminAuditService.log('Customer Reinstated', `${c.name} (${c.email})`); setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, suspended: false } : x)); toast.success(`${c.name} reinstated`); }}><CheckCircle className="w-3 h-3 mr-1" />Reinstate</Button>
                        : canSuspend && <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-50" onClick={() => { UserService.setSuspended(c.id, true); AdminAuditService.log('Customer Suspended', `${c.name} (${c.email})`); setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, suspended: true } : x)); toast.success(`${c.name} suspended`); }}><Ban className="w-3 h-3 mr-1" />Suspend</Button>
                      }
                      {canDelete && <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Reset password */}
      {resetTarget && (
        <Dialog open onOpenChange={() => { setResetTarget(null); setNewPassword(''); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>New password for <strong>{resetTarget.name}</strong></DialogDescription></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1"><Label>New Password</Label><Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setResetTarget(null); setNewPassword(''); }}>Cancel</Button>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => {
                  if (newPassword.length < 6) { toast.error('Min 6 characters'); return; }
                  UserService.resetPassword(resetTarget.id, newPassword);
                  AdminAuditService.log('Customer Password Reset', `${resetTarget.name} (${resetTarget.email})`);
                  toast.success(`Password reset for ${resetTarget.name}`);
                  setResetTarget(null); setNewPassword('');
                }}><KeyRound className="w-4 h-4 mr-1" />Reset</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Account</DialogTitle><DialogDescription>Permanently delete <strong>{deleteTarget.name}</strong>?</DialogDescription></DialogHeader>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-800 text-white" onClick={() => {
                UserService.delete(deleteTarget.id);
                AdminAuditService.log('Customer Deleted', `${deleteTarget.name} (${deleteTarget.email})`);
                setCustomers(prev => prev.filter(c => c.id !== deleteTarget.id));
                toast.success(`${deleteTarget.name} deleted`); setDeleteTarget(null);
              }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Promote to Admin */}
      {promoteTarget && (
        <Dialog open onOpenChange={() => setPromoteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promote to Admin</DialogTitle>
              <DialogDescription>Promote <strong>{promoteTarget.name}</strong> to an admin account? Their existing account and order history will be preserved. They will start with no permissions (Restricted access).</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setPromoteTarget(null)}>Cancel</Button>
              <Button className="bg-purple-700 hover:bg-purple-800 text-white" onClick={async () => {
                try {
                  await UserService.promote(promoteTarget.id);
                  AdminAuditService.log('Customer Promoted to Admin', `${promoteTarget.name} (${promoteTarget.email})`);
                  setCustomers(prev => prev.filter(c => c.id !== promoteTarget.id));
                  toast.success(`${promoteTarget.name} is now an admin`);
                  setPromoteTarget(null);
                } catch (e: any) { toast.error(e.message || 'Failed to promote'); }
              }}><ShieldPlus className="w-4 h-4 mr-1" />Promote to Admin</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer profile */}
      {profileTarget && (
        <Dialog open onOpenChange={() => setProfileTarget(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Customer Profile</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-lg">{profileTarget.name.charAt(0)}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{profileTarget.name}</p>
                    <p className="text-sm text-gray-500">{profileTarget.email}</p>
                    {profileTarget.phone && <p className="text-sm text-gray-500">{profileTarget.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                  <div><span className="text-gray-400">Joined</span><p>{new Date(profileTarget.createdAt).toLocaleDateString()}</p></div>
                  {profileTarget.ip && <div><span className="text-gray-400">IP Address</span><p className="font-mono text-xs">{profileTarget.ip}</p></div>}
                  <div><span className="text-gray-400">Status</span><p>{profileTarget.suspended ? '🚫 Suspended' : '✅ Active'}</p></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-blue-900" />Order History ({profileOrders.length})</h3>
                {profileOrders.length === 0
                  ? <p className="text-sm text-gray-400">No orders yet</p>
                  : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-gray-400">Total Orders</p><p className="text-xl font-bold text-blue-900">{profileOrders.length}</p></div>
                        <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-gray-400">Total Spent</p><p className="text-xl font-bold text-green-700">{formatCurrency(profileOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0))}</p></div>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {[...profileOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(o => (
                          <div key={o.id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                            <div><span className="font-medium">#{o.id.slice(-6)}</span><span className="text-gray-400 ml-2 text-xs">{new Date(o.createdAt).toLocaleDateString()}</span></div>
                            <div className="flex items-center gap-2"><span className="font-semibold text-blue-900">{formatCurrency(o.totalAmount)}</span><Badge className={`text-xs ${o.paymentStatus === 'paid' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{o.paymentStatus}</Badge></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
