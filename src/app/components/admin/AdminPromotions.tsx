import { useState, useEffect } from 'react';
import { User, Promotion } from '../../types';

import { PromotionService, ProductService, AdminAuditService, can, PERM } from '../../services/dataService';

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Tag, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

const emptyForm = {
  name: '',
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  active: true,
  productIds: [] as string[],
};
export default function AdminPromotions({ currentUser, isSuper }: Props) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
const [products, setProducts] = useState<any[]>([]);

  const canCreate = isSuper || can(currentUser, PERM.CREATE_PROMOTIONS);
  const canEdit = isSuper || can(currentUser, PERM.EDIT_PROMOTIONS);
  const canDelete = isSuper || can(currentUser, PERM.DELETE_PROMOTIONS);

  const load = async () => {
    if (!isSuper && !can(currentUser, PERM.VIEW_PROMOTIONS)) { setLoading(false); return; }
    try { setPromos(await PromotionService.getAll()); } catch (e: any) { toast.error(e.message || 'Failed to load promotions'); }
    finally { setLoading(false); }
  };

 useEffect(() => {
  load();

  ProductService.getAll()
    .then(setProducts)
    .catch(() => setProducts([]));
}, []);

  const save = async () => {
    const val = parseFloat(form.value);
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.code.trim()) { toast.error('Code required'); return; }
    if (isNaN(val) || val <= 0) { toast.error('Invalid value'); return; }
    if (form.type === 'percentage' && val > 100) { toast.error('Percentage cannot exceed 100'); return; }
    setSaving(true);
    try {
     const data = {
  name: form.name,
  code: form.code.toUpperCase(),
  type: form.type,
  value: val,
  startDate: form.startDate || undefined,
  endDate: form.endDate || undefined,
  usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
  active: form.active,
  productIds: form.productIds,
};
      if (editing) {
        await PromotionService.update(editing.id, data);
        AdminAuditService.log('Promotion Updated', `"${form.name}" — ${form.code}`);
        toast.success('Updated');
      } else {
        await PromotionService.create(data as any);
        AdminAuditService.log('Promotion Created', `"${form.name}" — code: ${form.code.toUpperCase()}`);
        toast.success('Promotion created');
      }
      await load(); setShowDialog(false); setEditing(null); setForm(emptyForm);
    } catch (e: any) { toast.error(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

const startEdit = (p: Promotion) => {
  setEditing(p);
  setForm({
    name: p.name,
    code: p.code,
    type: p.type,
    value: p.value.toString(),
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    usageLimit: p.usageLimit?.toString() ?? '',
    active: p.active,
    productIds: p.productIds ?? [],
  });
  setShowDialog(true);
};

  const toggle = async (id: string, name: string) => {
    try { await PromotionService.toggle(id); AdminAuditService.log('Promotion Toggled', name); await load(); }
    catch (e: any) { toast.error(e.message || 'Failed to toggle'); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm('Delete this promotion?')) return;
    try { await PromotionService.delete(id); AdminAuditService.log('Promotion Deleted', name); await load(); toast.success('Deleted'); }
    catch (e: any) { toast.error(e.message || 'Failed to delete'); }
  };

  if (!isSuper && !can(currentUser, PERM.VIEW_PROMOTIONS)) return <div className="text-center py-20 text-gray-400">You do not have permission to view promotions.</div>;
  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const isExpired = (p: Promotion) => p.endDate && new Date(p.endDate) < new Date();
  const isLimitReached = (p: Promotion) => p.usageLimit && p.usageCount >= p.usageLimit;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-blue-950">Promotions & Discounts</h2>
        {canCreate && <Button className="bg-blue-900 hover:bg-blue-800 text-white gap-1.5" onClick={() => { setEditing(null); setForm(emptyForm); setShowDialog(true); }}><Plus className="w-4 h-4" />Create Promotion</Button>}
      </div>

      {promos.length === 0
        ? <Card><CardContent className="p-12 text-center text-gray-400"><Tag className="w-10 h-10 mx-auto mb-3 text-gray-200" />No promotions yet</CardContent></Card>
        : (
          <div className="grid md:grid-cols-2 gap-4">
            {promos.map(p => {
              const expired = isExpired(p);
              const limitReached = isLimitReached(p);
              const effective = p.active && !expired && !limitReached;
              return (
                <Card key={p.id} className={`transition-all ${!effective ? 'opacity-60' : 'hover:shadow-md'}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-lg font-mono text-blue-900">{p.code}</p>
                        <p className="text-sm text-gray-600">{p.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={effective ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}>
                          {expired ? 'Expired' : limitReached ? 'Limit Reached' : p.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xl font-bold text-red-700">{p.type === 'percentage' ? `${p.value}%` : `GH₵${p.value}`} off</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      {p.startDate && <div><span className="text-gray-400">Starts:</span> {new Date(p.startDate).toLocaleDateString()}</div>}
                      {p.endDate && <div><span className="text-gray-400">Ends:</span> {new Date(p.endDate).toLocaleDateString()}</div>}
                      {p.usageLimit && <div><span className="text-gray-400">Used:</span> {p.usageCount} / {p.usageLimit}</div>}
                      <div><span className="text-gray-400">Type:</span> {p.type === 'percentage' ? 'Percentage' : 'Fixed amount'}</div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {(canEdit) && <button onClick={() => toggle(p.id, p.name)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${p.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{p.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}{p.active ? 'Active' : 'Inactive'}</button>}
                      {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-900 hover:bg-blue-50" onClick={() => startEdit(p)}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>}
                      {canDelete && <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50 ml-auto" onClick={() => del(p.id, p.name)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      <Dialog open={showDialog} onOpenChange={o => { setShowDialog(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Promotion' : 'Create Promotion'}</DialogTitle><DialogDescription>Set up a discount or coupon code.</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Promotion Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Summer Sale" /></div>
              <div className="space-y-1 col-span-2"><Label>Coupon Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" className="font-mono" /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: 'percentage' | 'fixed') => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (GH₵)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Value ({form.type === 'percentage' ? '%' : 'GH₵'})</Label><Input type="number" step="0.01" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label>Usage Limit (blank = unlimited)</Label><Input type="number" min="1" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} /></div>

<div className="space-y-2 col-span-2">
  <Label>Apply Promotion To</Label>

  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
    {products.length === 0 ? (
      <p className="text-sm text-gray-400 p-2">
        No products available.
      </p>
    ) : (
      products.map(product => {
        const selected = form.productIds.includes(product.id);

        return (
          <label
            key={product.id}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={e => {
                setForm(f => ({
                  ...f,
                  productIds: e.target.checked
                    ? [...f.productIds, product.id]
                    : f.productIds.filter(id => id !== product.id),
                }));
              }}
              className="w-4 h-4"
            />

            <span className="text-sm text-gray-700">
              {product.name}
            </span>
          </label>
        );
      })
    )}
  </div>

  <p className="text-xs text-gray-400">
    Select the products that should receive this promotion.
  </p>
</div>

            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="pactive" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" /><Label htmlFor="pactive">Active immediately</Label></div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => { setShowDialog(false); setEditing(null); setForm(emptyForm); }}>Cancel</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
