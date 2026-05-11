import { Router } from 'express';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: list all restaurants (with optional search by name/cuisine)
router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = {};
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { cuisine: new RegExp(q, 'i') },
    ];
  }
  const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
  res.json(restaurants);
});

// Public: single restaurant + its menu
router.get('/:id', async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Not found' });
  const menu = await MenuItem.find({ restaurant: restaurant._id, available: true });
  res.json({ restaurant, menu });
});

// Owner: create restaurant
router.post('/', auth, requireRole('restaurant_owner', 'admin'), async (req, res) => {
  const restaurant = await Restaurant.create({ ...req.body, owner: req.user._id });
  res.status(201).json(restaurant);
});

// Owner: add menu item
router.post('/:id/menu', auth, requireRole('restaurant_owner', 'admin'), async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your restaurant' });
  }
  const item = await MenuItem.create({ ...req.body, restaurant: restaurant._id });
  res.status(201).json(item);
});

// Owner: list "my" restaurants
router.get('/owner/mine', auth, requireRole('restaurant_owner', 'admin'), async (req, res) => {
  const list = await Restaurant.find({ owner: req.user._id });
  res.json(list);
});

// Owner: toggle open/closed
router.patch('/:id/toggle-open', auth, requireRole('restaurant_owner', 'admin'), async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your restaurant' });
  }
  restaurant.isOpen = !restaurant.isOpen;
  await restaurant.save();
  res.json(restaurant);
});

export default router;
