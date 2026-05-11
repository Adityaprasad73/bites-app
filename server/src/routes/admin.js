import { Router } from 'express';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('admin'));

// Stats
router.get('/stats', async (req, res) => {
  try {
    const [users, restaurants, orders] = await Promise.all([
      User.countDocuments(),
      Restaurant.countDocuments(),
      Order.countDocuments(),
    ]);
    const revenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    res.json({ users, restaurants, orders, revenue: revenue[0]?.total || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Users
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});
router.patch('/users/:id', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Restaurants
router.get('/restaurants', async (req, res) => {
  const list = await Restaurant.find().populate('owner', 'name email').sort({ createdAt: -1 });
  res.json(list);
});
router.patch('/restaurants/:id', async (req, res) => {
  try {
    const r = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/restaurants/:id', async (req, res) => {
  await Restaurant.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Orders
router.get('/orders', async (req, res) => {
  const { status, limit = 100 } = req.query;
  const filter = status ? { status } : {};
  const orders = await Order.find(filter)
    .populate('customer', 'name email')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 })
    .limit(Number(limit));
  res.json(orders);
});

export default router;
