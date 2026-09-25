import express from 'express';
import { Database } from '../database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all orders (admin) or user's orders
router.get('/', authenticateToken, (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = Database.getAll('orders');
    } else {
      orders = Database.getByField('orders', 'userId', req.user.userId);
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = Database.getById('orders', req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Users can only view their own orders, admins can view all
    if (req.user.role !== 'admin' && order.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
router.post('/', authenticateToken, (req, res) => {
  try {
    const { items, totalAmount, customerPhone, paymentMethod, paystackReference, customerName, customerEmail } = req.body;

    const order = {
      id: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: req.user.userId,
      items,
      totalAmount,
      customerPhone,
      customerName: customerName || req.user.name,
      customerEmail: customerEmail || req.user.email,
      paymentMethod,
      paystackReference,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    Database.create('orders', order);
    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (admin only)
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const updated = Database.update('orders', req.params.id, { status });
    
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order (admin only)
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const deleted = Database.delete('orders', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Also delete associated transactions and invoices
    Database.deleteByField('transactions', 'orderId', req.params.id);
    Database.deleteByField('invoices', 'orderId', req.params.id);

    res.json({ message: 'Order and related records deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
