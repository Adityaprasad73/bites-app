import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = Router();

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, address } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    const user = await User.create({ name, email, password, phone, role, address });
    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// Delivery partner: toggle online/offline status
router.patch('/toggle-online', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isOnline = !user.isOnline;
    await user.save();
    res.json({ isOnline: user.isOnline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile (name, phone, address, vehicleType)
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address, vehicleType } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (address) update.address = address;
    if (vehicleType) update.vehicleType = vehicleType;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
