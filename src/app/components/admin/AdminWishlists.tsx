import { useEffect, useState } from 'react';
import { Heart, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { WishlistService } from '../../services/dataService';
import { toast } from 'sonner';

interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  customerName: string;
  email: string;
  phone: string;
  addedAt?: string | null;
  dateTime?: string | null;
  product?: {
    name?: string;
    image?: string;
    price?: number;
  };
}

export default function AdminWishlists() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
const [hiddenItems, setHiddenItems] = useState<string[]>([]);

  const loadWishlists = async () => {
    try {
      setLoading(true);

      const data = await WishlistService.getAllForAdmin();

      setItems(Array.isArray(data) ? data : []);

    } catch (error: any) {
      console.error('Failed to load wishlists:', error);
      toast.error(
        error?.message || 'Failed to load customer wishlists'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlists();
  }, []);
const clearFromAdmin = async (id: string) => {
  try {
    await WishlistService.clearFromAdmin(id);

    setItems(prev => prev.filter(item => item.id !== id));

    toast.success('Wishlist item cleared from admin view');
  } catch (error: any) {
    console.error('Failed to clear wishlist item:', error);

    toast.error(
      error?.message || 'Failed to clear wishlist item'
    );
  }
};
  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-600">
          Loading customer wishlists...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Customer Wishlists
          </h1>

          <p className="text-gray-600 mt-1">
            Products customers have saved to their wishlists.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadWishlists}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="w-14 h-14 mx-auto text-gray-300 mb-4" />

            <h2 className="text-xl font-medium text-gray-900">
              No wishlist items
            </h2>

            <p className="text-gray-600 mt-2">
              Customers have not saved any products yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Customer
                  </th>

                  <th className="text-left px-4 py-3 font-semibold">
                    Email
                  </th>

                  <th className="text-left px-4 py-3 font-semibold">
                    Phone
                  </th>

                  <th className="text-left px-4 py-3 font-semibold">
                    Product
                  </th>

                  <th className="text-left px-4 py-3 font-semibold">
                    Date & Time
                  </th>
<th className="text-left px-4 py-3 font-semibold">
  Action
</th>
                </tr>
              </thead>

              <tbody className="divide-y">
              {items.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {item.customerName || 'Unknown Customer'}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {item.email || '—'}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {item.phone || '—'}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        {item.product?.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name || 'Product'}
                            className="w-12 h-12 rounded-lg object-contain bg-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-gray-400" />
                          </div>
                        )}

                        <div>
                          <p className="font-medium text-gray-900">
                            {item.product?.name || 'Unknown Product'}
                          </p>

                          {typeof item.product?.price === 'number' && (
                            <p className="text-gray-500">
                              {item.product.price.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {formatDateTime(
                        item.addedAt || item.dateTime
                      )}
                    </td>
<td className="px-4 py-4">
  <Button
    variant="outline"
    size="sm"
    onClick={() => clearFromAdmin(item.id)}
  >
    <Trash2 className="w-4 h-4 mr-2" />
    Clear
  </Button>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}