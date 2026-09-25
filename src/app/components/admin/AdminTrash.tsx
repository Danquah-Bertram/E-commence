import { useState, useEffect } from 'react';
import type { User, TrashItem, TrashItemType } from '../../types';
import { TrashService } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Trash2,
  RotateCcw,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingCart,
  MessageSquare,
  Tag,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/invoice';

interface Props {
  currentUser: User | null;
  isSuper: boolean;
  onNavigate: (s: any) => void;
  onMessageCountChange?: (n: number) => void;
}

const TYPE_CONFIG: Record<
  TrashItemType,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    badge: string;
  }
> = {
  product: {
    label: 'Product',
    icon: Package,
    color: 'border-orange-200 bg-orange-50',
    badge: 'bg-orange-100 text-orange-800',
  },
  order: {
    label: 'Order',
    icon: ShoppingCart,
    color: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
  },
  message: {
    label: 'Message',
    icon: MessageSquare,
    color: 'border-pink-200 bg-pink-50',
    badge: 'bg-pink-100 text-pink-800',
  },
  promotion: {
    label: 'Promotion',
    icon: Tag,
    color: 'border-purple-200 bg-purple-50',
    badge: 'bg-purple-100 text-purple-800',
  },
  customer: {
    label: 'Customer',
    icon: Users,
    color: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
  },
};

const TYPE_FILTERS: {
  value: TrashItemType | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'product', label: 'Products' },
  { value: 'order', label: 'Orders' },
  { value: 'message', label: 'Messages' },
  { value: 'promotion', label: 'Promotions' },
  { value: 'customer', label: 'Customers' },
];

/*
 * Safely get the original data.
 * Your TrashItem stores the deleted object inside "data".
 */
function getData(item: TrashItem): any {
  return item?.data ?? {};
}

/*
 * Get a display name for a deleted item.
 *
 * We cannot use item.itemLabel because your current TrashItem
 * interface does not contain that property.
 */
function getItemLabel(item: TrashItem): string {
  const d = getData(item);

  switch (item.type) {
    case 'product':
      return d.name || item.originalKey || item.originalId || 'Deleted product';

    case 'order':
      return (
        d.id ||
        item.originalKey ||
        item.originalId ||
        'Deleted order'
      );

    case 'message':
      return (
        d.subject ||
        d.name ||
        item.originalKey ||
        item.originalId ||
        'Deleted message'
      );

    case 'promotion':
      return (
        d.name ||
        d.code ||
        item.originalKey ||
        item.originalId ||
        'Deleted promotion'
      );

    case 'customer':
      return (
        d.name ||
        d.email ||
        item.originalKey ||
        item.originalId ||
        'Deleted customer'
      );

    default:
      return item.originalKey || item.originalId || 'Deleted item';
  }
}

/*
 * Details shown when an item is expanded.
 */
function ItemDetail({ item }: { item: TrashItem }) {
  const d = getData(item);

  if (item.type === 'product') {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-gray-400">Name</span>
          <p className="font-medium">{d.name || '—'}</p>
        </div>

        <div>
          <span className="text-gray-400">Price</span>
          <p>
            {typeof d.price === 'number'
              ? formatCurrency(d.price)
              : '—'}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Category</span>
          <p className="capitalize">{d.category || '—'}</p>
        </div>

        <div>
          <span className="text-gray-400">Stock</span>
          <p>
            {typeof d.stock === 'number'
              ? `${d.stock} units`
              : '—'}
          </p>
        </div>

        {d.sku && (
          <div>
            <span className="text-gray-400">SKU</span>
            <p className="font-mono text-xs">{d.sku}</p>
          </div>
        )}

        <div>
          <span className="text-gray-400">Available</span>
          <p>{d.available ? 'Yes' : 'No'}</p>
        </div>

        {d.description && (
          <div className="col-span-2">
            <span className="text-gray-400">Description</span>
            <p className="text-xs text-gray-600 mt-0.5">
              {d.description}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'order') {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-gray-400">Customer</span>
          <p className="font-medium">
            {d.customerName || '—'}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Email</span>
          <p>{d.customerEmail || '—'}</p>
        </div>

        <div>
          <span className="text-gray-400">Total</span>
          <p className="font-semibold">
            {typeof d.totalAmount === 'number'
              ? formatCurrency(d.totalAmount)
              : '—'}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Payment</span>
          <p className="capitalize">
            {d.paymentStatus || '—'}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Status</span>
          <p className="capitalize">
            {d.orderStatus || '—'}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Reference</span>
          <p className="font-mono text-xs">
            {d.paystackReference || '—'}
          </p>
        </div>

        {Array.isArray(d.items) && d.items.length > 0 && (
          <div className="col-span-2">
            <span className="text-gray-400">
              Items ({d.items.length})
            </span>

            <ul className="mt-1 space-y-1">
              {d.items.map((it: any, i: number) => (
                <li
                  key={i}
                  className="text-xs text-gray-600"
                >
                  {it?.productName || 'Unknown product'} ×{' '}
                  {it?.quantity ?? 0} —{' '}
                  {typeof it?.price === 'number'
                    ? formatCurrency(it.price)
                    : '—'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'message') {
    return (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <span className="text-gray-400">From</span>
            <p className="font-medium">{d.name || '—'}</p>
          </div>

          <div>
            <span className="text-gray-400">Email</span>
            <p>{d.email || '—'}</p>
          </div>

          {d.phone && (
            <div>
              <span className="text-gray-400">Phone</span>
              <p>{d.phone}</p>
            </div>
          )}

          <div>
            <span className="text-gray-400">Subject</span>
            <p>{d.subject || '—'}</p>
          </div>
        </div>

        {d.message && (
          <div>
            <span className="text-gray-400 text-xs">
              Message
            </span>

            <p className="text-xs text-gray-700 mt-1 bg-gray-50 rounded p-2 whitespace-pre-wrap">
              {d.message}
            </p>
          </div>
        )}

        {d.adminReply && (
          <div>
            <span className="text-gray-400 text-xs">
              Admin Reply
            </span>

            <p className="text-xs text-blue-700 mt-1 bg-blue-50 rounded p-2 whitespace-pre-wrap">
              {d.adminReply}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'promotion') {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-gray-400">Name</span>
          <p className="font-medium">{d.name || '—'}</p>
        </div>

        <div>
          <span className="text-gray-400">Code</span>
          <p className="font-mono font-bold">
            {d.code || '—'}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Type</span>
          <p className="capitalize">{d.type || '—'}</p>
        </div>

        <div>
          <span className="text-gray-400">Value</span>
          <p>
            {d.type === 'percentage'
              ? `${d.value ?? 0}%`
              : typeof d.value === 'number'
                ? formatCurrency(d.value)
                : '—'}
          </p>
        </div>

        {d.startDate && (
          <div>
            <span className="text-gray-400">Start</span>
            <p>
              {new Date(d.startDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {d.endDate && (
          <div>
            <span className="text-gray-400">End</span>
            <p>
              {new Date(d.endDate).toLocaleDateString()}
            </p>
          </div>
        )}

        <div>
          <span className="text-gray-400">Usage</span>
          <p>
            {d.usageCount ?? 0}
            {d.usageLimit
              ? ` / ${d.usageLimit}`
              : ''}
          </p>
        </div>
      </div>
    );
  }

  if (item.type === 'customer') {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-gray-400">Name</span>
          <p className="font-medium">{d.name || '—'}</p>
        </div>

        <div>
          <span className="text-gray-400">Email</span>
          <p>{d.email || '—'}</p>
        </div>

        {d.phone && (
          <div>
            <span className="text-gray-400">Phone</span>
            <p>{d.phone}</p>
          </div>
        )}

        {d.createdAt && (
          <div>
            <span className="text-gray-400">Joined</span>
            <p>
              {new Date(d.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}

        <div>
          <span className="text-gray-400">Status</span>
          <p>
            {d.suspended ? 'Suspended' : 'Active'}
          </p>
        </div>

        <div className="col-span-2 text-xs text-amber-700 bg-amber-50 rounded p-2 mt-1">
          Restored customers must reset their password via
          "Forgot Password" to regain login access.
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-500">
      No additional details available.
    </div>
  );
}

export default function AdminTrash({
  isSuper,
}: Props) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] =
    useState<TrashItemType | 'all'>('all');
  const [expanded, setExpanded] =
    useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] =
    useState<TrashItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<TrashItem | null>(null);
  const [actionInFlight, setActionInFlight] =
    useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const data = await TrashService.getAll();

      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load trash:', e);

      toast.error(
        e?.message || 'Failed to load trash'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuper) {
      load();
    }
  }, [isSuper]);

  if (!isSuper) {
    return null;
  }




const filtered = items.filter((item) => {
  // Hide old/unsupported trash records such as "revenue"
  if (!TYPE_CONFIG[item.type]) {
    return false;
  }

  if (
    typeFilter !== 'all' &&
    item.type !== typeFilter
  ) {
    return false;
  }

  if (!search.trim()) {
    return true;
  }

  const s = search.toLowerCase();

  const label = getItemLabel(item).toLowerCase();

  const deletedBy = (
    item.deletedByName || ''
  ).toLowerCase();

  const originalKey = (
    item.originalKey || ''
  ).toLowerCase();

  const originalId = (
    item.originalId || ''
  ).toLowerCase();

  return (
    label.includes(s) ||
    deletedBy.includes(s) ||
    originalKey.includes(s) ||
    originalId.includes(s)
  );
});



  const restore = async () => {
    if (!restoreTarget) {
      return;
    }

    setActionInFlight(true);

    try {
      await TrashService.restore(
        restoreTarget.id
      );

      setItems((prev) =>
        prev.filter(
          (i) => i.id !== restoreTarget.id
        )
      );

      toast.success(
        `"${getItemLabel(
          restoreTarget
        )}" restored successfully`
      );

      setRestoreTarget(null);
    } catch (e: any) {
      console.error('Restore failed:', e);

      toast.error(
        e?.message || 'Restore failed'
      );
    } finally {
      setActionInFlight(false);
    }
  };

  const permanentDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setActionInFlight(true);

    try {
      await TrashService.permanentDelete(
        deleteTarget.id
      );

      setItems((prev) =>
        prev.filter(
          (i) => i.id !== deleteTarget.id
        )
      );

      toast.success(
        `"${getItemLabel(
          deleteTarget
        )}" permanently deleted`
      );

      setDeleteTarget(null);
    } catch (e: any) {
      console.error(
        'Permanent delete failed:',
        e
      );

      toast.error(
        e?.message ||
          'Permanent delete failed'
      );
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-blue-950">
            Recycle Bin
          </h2>

          <p className="text-xs text-gray-400 mt-0.5">
            Soft-deleted items — restore or permanently
            remove
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-gray-600"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() =>
              setTypeFilter(f.value)
            }
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              typeFilter === f.value
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

        <Input
          placeholder="Search by item, ID, or deleted by..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-14 text-center text-gray-400">
            <Trash2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />

         {filtered.length === 0
  ? 'Recycle Bin is empty'
  : 'No items match your filter'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">



        {filtered.map((item) => {
  const cfg = TYPE_CONFIG[item.type];

  if (!cfg) {
    console.error(
      'Unknown trash item type:',
      item.type,
      item
    );

    return (
      <Card
        key={item.id}
        className="border-gray-200 bg-gray-50"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />

            <div>
              <p className="font-medium text-gray-900">
                Unknown deleted item
              </p>

              <p className="text-xs text-gray-500">
                Type: {item.type || 'undefined'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = cfg.icon;

            const isExpanded =
              expanded === item.id;

            const label =
              getItemLabel(item);

            return (
              <Card
                key={item.id}
                className={`transition-all ${cfg.color}`}
              >
                <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Item information */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`text-xs ${cfg.badge}`}
                          >
                            {cfg.label}
                          </Badge>

                          <span className="font-medium text-gray-900 text-sm truncate">
                            {label}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 mt-0.5">
                          Deleted by{' '}
                          <span className="font-medium">
                            {item.deletedByName ||
                              'Unknown'}
                          </span>

                          <span className="mx-1">
                            •
                          </span>

                          {item.deletedAt
                            ? new Date(
                                item.deletedAt
                              ).toLocaleString()
                            : 'Unknown date'}
                        </p>

                        {(item.originalKey ||
                          item.originalId) && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {item.originalKey &&
                              `Key: ${item.originalKey}`}

                            {item.originalKey &&
                              item.originalId &&
                              ' • '}

                            {item.originalId &&
                              `ID: ${item.originalId}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                 <div className="w-full sm:w-auto flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setExpanded(
                            isExpanded
                              ? null
                              : item.id
                          )
                        }
                       className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}

                        Details
                      </button>

                      <Button
                        size="sm"
                        variant="outline"
                       className="flex-1 sm:flex-none h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 bg-white"
                        onClick={() =>
                          setRestoreTarget(item)
                        }
                        disabled={
                          actionInFlight
                        }
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />

                        Restore
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 bg-white"
                        onClick={() =>
                          setDeleteTarget(item)
                        }
                        disabled={
                          actionInFlight
                        }
                      >
                        <Trash2 className="w-3 h-3 mr-1" />

                        Delete Forever
                      </Button>
                    </div>
                  </div>

                  {/* Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/60">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Original Content
                      </p>

                      <ItemDetail item={item} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Restore confirmation */}
      {restoreTarget && (
        <Dialog
          open
          onOpenChange={() =>
            setRestoreTarget(null)
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-green-600" />
                Restore Item
              </DialogTitle>

              <DialogDescription>
                Restore{' '}
                <strong>
                  {getItemLabel(
                    restoreTarget
                  )}
                </strong>{' '}
                (


              {
  TYPE_CONFIG[restoreTarget.type]?.label ||
  restoreTarget.type ||
  'Unknown item'
}



                ) to its original location?

                {restoreTarget.type ===
                  'customer' && (
                  <span className="block mt-2 text-amber-700 text-xs bg-amber-50 p-2 rounded">
                    The customer account will be
                    restored but they must use
                    "Forgot Password" to set a new
                    login password.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setRestoreTarget(null)
                }
                disabled={actionInFlight}
              >
                Cancel
              </Button>

              <Button
                className="bg-green-700 hover:bg-green-800 text-white"
                onClick={restore}
                disabled={actionInFlight}
              >
                <RotateCcw className="w-4 h-4 mr-1" />

                {actionInFlight
                  ? 'Restoring...'
                  : 'Restore'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Permanent delete confirmation */}
      {deleteTarget && (
        <Dialog
          open
          onOpenChange={() =>
            setDeleteTarget(null)
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Permanently Delete
              </DialogTitle>

              <DialogDescription>
                Permanently delete{' '}
                <strong>
                  {getItemLabel(deleteTarget)}
                </strong>
                ?

                <strong className="block mt-1">
                  This cannot be undone — the item
                  will be gone forever.
                </strong>
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={actionInFlight}
              >
                Cancel
              </Button>

              <Button
                className="bg-red-700 hover:bg-red-800 text-white"
                onClick={permanentDelete}
                disabled={actionInFlight}
              >
                <Trash2 className="w-4 h-4 mr-1" />

                {actionInFlight
                  ? 'Deleting...'
                  : 'Delete Forever'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}