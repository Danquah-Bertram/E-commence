import express from 'express';
import { Database } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's cart
router.get('/', authenticateToken, (req, res) => {
  try {
    const cartItems = Database.getByField('cart', 'userId', req.user.userId);
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add to cart
router.post('/', authenticateToken, (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;

    // Check if item already exists in cart
    const existingItems = Database.getByField('cart', 'userId', userId);
    const existingItem = existingItems.find(item => item.productId === productId);

    if (existingItem) {
      // Update quantity
      const updated = Database.update('cart', existingItem.id, {
        quantity: existingItem.quantity + quantity
      });
      return res.json(updated);
    }

    // Get product details
    const product = Database.getById('products', productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create cart item
    const cartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      productId,
      product,
      quantity,
      addedAt: new Date().toISOString()
    };

    Database.create('cart', cartItem);
    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item quantity
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItem = Database.getById('cart', req.params.id);

    if (!cartItem || cartItem.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const updated = Database.update('cart', req.params.id, { quantity });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove from cart
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const cartItem = Database.getById('cart', req.params.id);

    if (!cartItem || cartItem.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    Database.delete('cart', req.params.id);
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear cart
router.delete('/', authenticateToken, (req, res) => {
  try {
    Database.deleteByField('cart', 'userId', req.user.userId);
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
