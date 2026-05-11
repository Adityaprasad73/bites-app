import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Create a Razorpay order
router.post('/create-order', auth, requireRole('customer'), async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
    const rz = getRazorpay();
    const order = await rz.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `bites_${Date.now()}`,
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify payment signature after Razorpay checkout completes
router.post('/verify', auth, requireRole('customer'), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
    res.json({ verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
