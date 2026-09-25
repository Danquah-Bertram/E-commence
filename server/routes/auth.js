import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = Database.getByField('users', 'email', email)[0];
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      password: hashedPassword,
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    Database.create('users', user);

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = Database.getByField('users', 'email', email)[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = Database.getById('users', decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, currentPassword, newPassword } = req.body;

    const user = Database.getById('users', decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};

    // Update name
    if (name && name !== user.name) {
      updates.name = name;
    }

    // Update password
    if (currentPassword && newPassword) {
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length > 0) {
      Database.update('users', user.id, updates);
    }

    res.json({
      user: {
        id: user.id,
        name: updates.name || user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Forgot password (generate reset token)
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    const user = Database.getByField('users', 'email', email)[0];

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In production, you would send an email with the reset link
    // For now, we'll just return the token
    res.json({
      message: 'Reset token generated',
      resetToken // In production, this would be sent via email
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Verify password reset token
router.get('/verify-reset-token/:token', (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ valid: false });
    }

    const user = Database.getById('users', decoded.userId);

    if (!user) {
      return res.status(400).json({ valid: false });
    }

    res.json({ valid: true });
  } catch (error) {
    res.status(400).json({ valid: false });
  }
});



// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    Database.update('users', decoded.userId, { password: hashedPassword });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

export default router;
