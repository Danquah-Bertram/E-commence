import express from 'express';
import { Database } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's invoices or all (admin)
router.get('/', authenticateToken, (req, res) => {
  try {
    let invoices;
    if (req.user.role === 'admin') {
      invoices = Database.getAll('invoices');
    } else {
      invoices = Database.getByField('invoices', 'userId', req.user.userId);
    }
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by order ID
router.get('/order/:orderId', authenticateToken, (req, res) => {
  try {
    const invoices = Database.getByField('invoices', 'orderId', req.params.orderId);
    const invoice = invoices[0];
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Users can only view their own invoices, admins can view all
    if (req.user.role !== 'admin' && invoice.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post('/', authenticateToken, (req, res) => {
  try {
    const { orderId, invoiceNumber, items, totalAmount, paystackReference } = req.body;

    const invoice = {
      id: `inv-${Date.now()}`,
      orderId,
      userId: req.user.userId,
      invoiceNumber,
      items,
      totalAmount,
      paystackReference,
      createdAt: new Date().toISOString()
    };

    Database.create('invoices', invoice);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

export default router;
