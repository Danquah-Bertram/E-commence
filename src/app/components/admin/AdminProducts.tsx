import { useState, useEffect, useRef } from 'react';
import { User, Product } from '../../types';
import { ProductService, CategoryService, AdminAuditService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/invoice';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

export default function AdminProducts({ currentUser, isSuper }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', image: '', category: 'other', stock: '', available: true });
  const [loadingCats, setLoadingCats] = useState(false);
  const [saving, setSaving] = useState(false);

  const canAdd = isSuper || can(currentUser, PERM.ADD_PRODUCTS);
  const canEdit = isSuper || can(currentUser, PERM.EDIT_PRODUCTS);
  const canDelete = isSuper || can(currentUser, PERM.DELETE_PRODUCTS);
  const canManageCats = isSuper || can(currentUser, PERM.MANAGE_CATEGORIES);

  useEffect(() => {
    ProductService.getAll().then(setProducts).catch(e => toast.error(e.message || 'Failed to load products'));
    CategoryService.getAll().then(setCategories).catch(() => {});
  }, []);

  const resetForm = () => { setForm({ name: '', description: '', price: '', image: '', category: 'other', stock: '', available: true }); setEditing(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const compressImage = (dataUrl: string, maxSize = 800, quality = 0.75): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Image files only'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    const r = new FileReader();
    r.onloadend = async () => {
      const compressed = await compressImage(r.result as string);
      setForm(f => ({ ...f, image: compressed }));
      setImagePreview(compressed);
    };
    r.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Product name required'); return; }
    const data = { name: form.name, description: form.description, price: parseFloat(form.price) || 0, image: form.image, category: form.category, stock: parseInt(form.stock) || 0, available: form.available };
    setSaving(true);
    try {
      if (editing) {
        await ProductService.update(editing.id, data);
        AdminAuditService.log('Product Updated', `"${data.name}" — GH₵${data.price}`);
        toast.success('Product updated');
      } else {
        await ProductService.create(data);
        AdminAuditService.log('Product Created', `"${data.name}" — GH₵${data.price}`);
        toast.success('Product created');
      }
      setShowProductDialog(false); resetForm();
      ProductService.getAll().then(setProducts).catch(() => {});
    } catch (e: any) { toast.error(e?.message || 'Failed to save product'); }
    finally { setSaving(false); }
  };

  const handleEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description, price: p.price.toString(), image: p.image, category: p.category, stock: p.stock.toString(), available: p.available }); setImagePreview(p.image); setShowProductDialog(true); };

  if (!isSuper && !can(currentUser, PERM.VIEW_PRODUCTS)) return <div className="text-center py-20 text-gray-400">You do not have permission to view products.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-blue-950">Products ({products.length})</h2>
        <div className="flex gap-2">
          {canManageCats && <Button variant="outline" className="border-blue-900 text-blue-900 hover:bg-blue-50 gap-1.5" onClick={() => setShowCategoryManager(true)}><Plus className="w-4 h-4" />Categories</Button>}
          {canAdd && <Button className="bg-blue-900 hover:bg-blue-800 text-white gap-1.5" onClick={() => setShowProductDialog(true)}><Plus className="w-4 h-4" />Add Product</Button>}
        </div>
      </div>

      {products.length === 0
        ? <Card><CardContent className="p-12 text-center text-gray-400">No products yet.</CardContent></Card>
        : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <Card key={p.id} className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 space-y-3">
                  <img src={p.image} alt={p.name} className="w-full h-36 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'; }} />
                  <div><h3 className="font-semibold text-gray-900">{p.name}</h3><p className="text-sm text-gray-400 line-clamp-2">{p.description}</p></div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">{formatCurrency(p.price)}</span>
                    <div className="flex gap-1">
                      <Badge className={p.available ? 'bg-blue-900' : 'bg-gray-200 text-gray-600'}>{p.available ? 'Available' : 'Hidden'}</Badge>
                      {p.stock === 0 && <Badge className="bg-red-700">Out of stock</Badge>}
                      {p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5) && <Badge className="bg-amber-100 text-amber-800">Low stock</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Stock: {p.stock} · {CategoryService.label(p.category)}</p>
                  <div className="flex gap-2">
                    {canEdit && <Button variant="outline" size="sm" onClick={() => handleEdit(p)} className="flex-1 gap-1 border-blue-900 text-blue-900 hover:bg-blue-50"><Edit2 className="w-3 h-3" /> Edit</Button>}
                    {canDelete && <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-200 hover:bg-red-50" onClick={async () => { if (!confirm('Delete this product?')) return; try { await ProductService.delete(p.id); AdminAuditService.log('Product Deleted', `"${p.name}"`); setProducts(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Failed to delete'); } }}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Product dialog */}
      <Dialog open={showProductDialog} onOpenChange={o => { setShowProductDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle><DialogDescription>Fill in the product details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Price (GH₵)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{CategoryService.label(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              {imagePreview && <div className="relative inline-block"><img src={imagePreview} alt="preview" className="w-28 h-28 object-cover rounded-lg border" /><button type="button" onClick={() => { setForm(f => ({ ...f, image: '' })); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-red-700 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>}
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" />Upload</Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Input value={form.image.startsWith('data:') ? '' : form.image} onChange={e => { setForm(f => ({ ...f, image: e.target.value })); setImagePreview(e.target.value); }} placeholder="Or paste image URL…" />
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="avail" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} className="w-4 h-4" /><Label htmlFor="avail">Available for sale</Label></div>
            <Button onClick={save} disabled={saving} className="w-full bg-blue-900 hover:bg-blue-800 text-white">{saving ? 'Saving…' : editing ? 'Update Product' : 'Create Product'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category manager */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Categories</DialogTitle><DialogDescription>Add or remove product categories.</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input placeholder="New category…" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} onKeyDown={async e => { if (e.key === 'Enter' && newCategoryInput.trim()) { e.preventDefault(); setLoadingCats(true); try { const updated = await CategoryService.add(newCategoryInput); setCategories(updated); AdminAuditService.log('Category Added', `"${newCategoryInput.trim()}"`); setNewCategoryInput(''); toast.success('Added'); } catch (err: any) { toast.error(err.message || 'Failed'); } finally { setLoadingCats(false); } } }} />
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" disabled={loadingCats} onClick={async () => { if (!newCategoryInput.trim()) return; setLoadingCats(true); try { const updated = await CategoryService.add(newCategoryInput); setCategories(updated); AdminAuditService.log('Category Added', `"${newCategoryInput.trim()}"`); setNewCategoryInput(''); toast.success('Added'); } catch (err: any) { toast.error(err.message || 'Failed'); } finally { setLoadingCats(false); } }}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg group hover:bg-gray-100">
                  <span className="text-sm text-gray-800">{CategoryService.label(cat)}</span>
                  <button type="button" className="text-red-400 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-all" onClick={async () => { setLoadingCats(true); try { const label = CategoryService.label(cat); const updated = await CategoryService.remove(cat); setCategories(updated); AdminAuditService.log('Category Removed', `"${label}"`); toast.success('Removed'); } catch (err: any) { toast.error(err.message || 'Failed'); } finally { setLoadingCats(false); } }}><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <Button className="w-full bg-blue-900 hover:bg-blue-800 text-white" onClick={() => setShowCategoryManager(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
