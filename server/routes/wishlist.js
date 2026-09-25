import express from 'express';
import { Database } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get current user's wishlist
router.get('/', authenticateToken, (req, res) => {
  try {
    const items = Database.getByField('wishlist', 'userId', req.user.userId);
    res.json(items);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add product to wishlist
router.post('/', authenticateToken, (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.userId;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = Database.getById('products', productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingItems = Database.getByField('wishlist', 'userId', userId);
    const existingItem = existingItems.find(
      item => item.productId === productId
    );

    if (existingItem) {
      return res.json(existingItem);
    }

    const wishlistItem = {
      id: `wishlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      productId,
      product,
      addedAt: new Date().toISOString()
    };

    Database.create('wishlist', wishlistItem);

    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Remove product from wishlist
router.delete('/:productId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.productId;

    const items = Database.getByField('wishlist', 'userId', userId);
    const item = items.find(item => item.productId === productId);

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    Database.delete('wishlist', item.id);

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Remove wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove wishlist item' });
  }
});

// Clear current user's wishlist
router.delete('/', authenticateToken, (req, res) => {
  try {
    Database.deleteByField('wishlist', 'userId', req.user.userId);
    res.json({ message: 'Wishlist cleared' });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ error: 'Failed to clear wishlist' });
  }
});

// Admin: get all customer wishlists
router.get('/admin/all', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const items = Database.getAll('wishlist');
    res.json(items);
  } catch (error) {
    console.error('Get all wishlists error:', error);
    res.status(500).json({ error: 'Failed to fetch customer wishlists' });
  }
});

export default router;