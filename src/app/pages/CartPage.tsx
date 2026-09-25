import { useState, useEffect, useRef } from 'react';
import { CartItem } from '../types';
import { CartService, PromotionService } from '../services/dataService';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/invoice';

interface CartPageProps {
  onNavigate: (page: 'products' | 'checkout') => void;
}

export default function CartPage({ onNavigate }: CartPageProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
const [promotions, setPromotions] = useState<any[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    loadCart();
    try {
      channelRef.current = new BroadcastChannel('phoneaccess_sync');
      channelRef.current.onmessage = () => loadCart();
    } catch {}
    return () => { channelRef.current?.close(); };
  }, []);

 const loadCart = async () => {
  setIsLoading(true);
  try {
    const [items, activePromotions] = await Promise.all([
      CartService.getAll(),
      PromotionService.getActive(),
    ]);

    setCartItems(items);
    setPromotions(activePromotions);
  } catch (error) {
    console.error('Failed to load cart:', error);
    toast.error('Failed to load cart');
  } finally {
    setIsLoading(false);
  }
};





const updateQuantity = async (cartItemId: string, newQuantity: number) => {
  if (newQuantity <= 0) {
    await removeItem(cartItemId);
    return;
  }

  // Update the screen immediately
  setCartItems(prev =>
    prev.map(item =>
      item.productId === cartItemId
        ? { ...item, quantity: newQuantity }
        : item
    )
  );

  try {
    await CartService.updateQuantity(cartItemId, newQuantity);
  } catch (error) {
    toast.error('Failed to update quantity');
    await loadCart();
  }
};
  const removeItem = async (cartItemId: string) => {
    try {
      await CartService.remove(cartItemId);
      await loadCart();
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };
const getProductPromotion = (productId: string) => {
  return promotions.find(
    p =>
      p.active &&
      (!p.productIds || p.productIds.includes(productId))
  );
};

const getDiscountedPrice = (price: number, promotion?: any) => {
  if (!promotion) return price;

  if (promotion.type === 'percentage') {
    return Math.max(
      0,
      price - (price * promotion.value / 100)
    );
  }

  return Math.max(0, price - promotion.value);
};

const getItemPrice = (item: CartItem) => {
  const promotion = getProductPromotion(item.productId);
  return getDiscountedPrice(item.product.price, promotion);
};

  const subtotal = cartItems.reduce((total, item) => {
  return total + (getItemPrice(item) * item.quantity);
}, 0);

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto" />
        <h2 className="text-2xl text-gray-900">Your cart is empty</h2>
        <p className="text-gray-600">Add some products to get started!</p>
        <Button onClick={() => onNavigate('products')}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-gray-900">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
         {cartItems.map(item => (
  <Card key={item.productId} className="w-full min-w-0 overflow-hidden">
    <CardContent className="p-4 min-w-0">
    <div className="flex flex-col sm:flex-row gap-4 min-w-0 w-full">

        <img
          src={item.product.image}
          alt={item.product.name}
          className="w-24 h-24 object-cover rounded-lg shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="text-lg text-gray-900 break-words">
  {item.product.name}
</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 break-words">
  {item.product.description}
</p>
                 <div className="flex items-center gap-2 flex-wrap">
  {getItemPrice(item) < item.product.price ? (
    <>
      <span className="text-gray-400 line-through">
        {formatCurrency(item.product.price)}
      </span>

      <span className="text-lg font-semibold text-green-600">
        {formatCurrency(getItemPrice(item))}
      </span>

      {getProductPromotion(item.productId) && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
          {getProductPromotion(item.productId).type === 'percentage'
            ? `${getProductPromotion(item.productId).value}% OFF`
            : 'PROMO'}
        </span>
      )}
    </>
  ) : (
    <span className="text-lg text-blue-600">
      {formatCurrency(item.product.price)}
    </span>
  )}
</div> 
                  </div>

             <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 w-full sm:w-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    
                   <div className="text-sm text-gray-600">
  Total: {formatCurrency(getItemPrice(item) * item.quantity)}
</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl text-gray-900">Order Summary</h3>
              
              <div className="space-y-2">
                {cartItems.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.product.name} x {item.quantity}
                    </span>
                   <span className="text-gray-900">
  {formatCurrency(getItemPrice(item) * item.quantity)}
</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-600">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => onNavigate('checkout')}
              >
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Secure checkout powered by Paystack. We accept Mobile Money and all major cards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}