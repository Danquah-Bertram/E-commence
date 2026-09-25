import express from 'express';
import { Database } from '../database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all transactions (admin only)
router.get('/', authenticateToken, isAdmin, (req, res) => {
  try {
    const transactions = Database.getAll('transactions');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const transaction = Database.getById('transactions', req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Users can only view their own transactions, admins can view all
    if (req.user.role !== 'admin' && transaction.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
router.post('/', authenticateToken, (req, res) => {
  try {
    const { orderId, amount, paymentMethod, paystackReference, status, customerPhone } = req.body;

    const transaction = {
      id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.userId,
      orderId,
      amount,
      paymentMethod,
      paystackReference,
      status: status || 'success',
      customerPhone,
      createdAt: new Date().toISOString()
    };

    Database.create('transactions', transaction);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

export default router;
