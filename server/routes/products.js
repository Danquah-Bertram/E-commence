import express from 'express';
import { Database } from '../database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products
router.get('/', (req, res) => {
  try {
    const products = Database.getAll('products');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', (req, res) => {
  try {
    const product = Database.getById('products', req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin only)
router.post('/', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description, price, category, imageUrl, available } = req.body;

    const product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      price,
      category,
      imageUrl,
      available: available !== undefined ? available : true,
      createdAt: new Date().toISOString()
    };

    Database.create('products', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description, price, category, imageUrl, available } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (available !== undefined) updates.available = available;

    const updatedProduct = Database.update('products', req.params.id, updates);
    
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const deleted = Database.delete('products', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
