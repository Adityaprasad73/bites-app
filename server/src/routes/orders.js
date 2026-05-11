import { Router } from 'express';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import { auth, requireRole } from '../middleware/auth.js';
import { emitOrderUpdate } from '../sockets/index.js';

const router = Router();

// Customer places order
router.post('/', auth, requireRole('customer'), async (req, res) => {
  try {
    const { restaurantId, items, address } = req.body;
    if (!restaurantId || !Array.isArray(items) || items.length === 0 || !address) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    // Validate all IDs are valid MongoDB ObjectIds before hitting the DB
    const isValidId = (id) => /^[a-f\d]{24}$/i.test(String(id));
    if (!isValidId(restaurantId)) return res.status(400).json({ error: 'Invalid restaurant ID' });
    for (const i of items) {
      if (!isValidId(i.menuItemId)) return res.status(400).json({ error: `Invalid menu item ID: ${i.menuItemId}. Please clear your cart and add items again.` });
    }
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isOpen) return res.status(400).json({ error: 'Restaurant unavailable' });

    const menuIds = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuIds }, restaurant: restaurant._id });
    const map = new Map(menuItems.map((m) => [String(m._id), m]));

    const orderItems = [];
    let subtotal = 0;
    for (const i of items) {
      const m = map.get(String(i.menuItemId));
      if (!m) return res.status(400).json({ error: `Menu item ${i.menuItemId} not found` });
      const qty = Math.max(1, Number(i.quantity) || 1);
      orderItems.push({ menuItem: m._id, name: m.name, price: m.price, quantity: qty });
      subtotal += m.price * qty;
    }
    const deliveryFee = 30;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: req.user._id,
      restaurant: restaurant._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      address,
    });

    emitOrderUpdate(order, { event: 'order:new' });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer: my orders
router.get('/mine', auth, requireRole('customer'), async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('restaurant', 'name image')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// Owner analytics
router.get('/restaurant/:rid/analytics', auth, requireRole('restaurant_owner', 'admin'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.rid);
    if (!restaurant) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [dailyRevenue, topItems, statusBreakdown, totals] = await Promise.all([
      Order.aggregate([
        { $match: { restaurant: restaurant._id, status: 'delivered', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { restaurant: restaurant._id, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { restaurant: restaurant._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { restaurant: restaurant._id, status: 'delivered' } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
    ]);
    res.json({ dailyRevenue, topItems, statusBreakdown, totals: totals[0] || { revenue: 0, orders: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single order (customer who placed it, restaurant owner, assigned partner, or admin)
router.get('/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('restaurant', 'name image address')
    .populate('customer', 'name phone')
    .populate('deliveryPartner', 'name phone');
  if (!order) return res.status(404).json({ error: 'Not found' });

  const uid = String(req.user._id);
  const isCustomer = String(order.customer._id) === uid;
  const isPartner = order.deliveryPartner && String(order.deliveryPartner._id) === uid;
  const isAdmin = req.user.role === 'admin';
  let isOwner = false;
  if (req.user.role === 'restaurant_owner') {
    const r = await Restaurant.findById(order.restaurant._id);
    isOwner = r && String(r.owner) === uid;
  }
  if (!(isCustomer || isPartner || isAdmin || isOwner)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(order);
});

// Restaurant owner: orders for my restaurants
router.get('/restaurant/incoming', auth, requireRole('restaurant_owner', 'admin'), async (req, res) => {
  const myRestaurants = await Restaurant.find({ owner: req.user._id }).select('_id');
  const ids = myRestaurants.map((r) => r._id);
  const orders = await Order.find({ restaurant: { $in: ids } })
    .populate('customer', 'name phone')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// Delivery partner: available orders (ready, no partner yet) + my active
router.get('/delivery/feed', auth, requireRole('delivery_partner', 'admin'), async (req, res) => {
  const available = await Order.find({
    status: 'ready_for_pickup',
    deliveryPartner: null,
  })
    .populate('restaurant', 'name address')
    .populate('customer', 'name')
    .sort({ createdAt: 1 });
  const mine = await Order.find({
    deliveryPartner: req.user._id,
    status: { $in: ['ready_for_pickup', 'out_for_delivery'] },
  })
    .populate('restaurant', 'name address')
    .populate('customer', 'name phone');
  res.json({ available, mine });
});

// Status transition validator
const TRANSITIONS = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup'],
  ready_for_pickup: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });

    if (!TRANSITIONS[order.status].includes(status)) {
      return res.status(400).json({ error: `Cannot move from ${order.status} to ${status}` });
    }

    // role-based authorization for the transition
    const uid = String(req.user._id);
    const role = req.user.role;
    let allowed = role === 'admin';

    if (role === 'restaurant_owner' && ['accepted', 'preparing', 'ready_for_pickup', 'cancelled'].includes(status)) {
      const r = await Restaurant.findById(order.restaurant);
      allowed = r && String(r.owner) === uid;
    }
    if (role === 'delivery_partner' && ['out_for_delivery', 'delivered'].includes(status)) {
      allowed = order.deliveryPartner && String(order.deliveryPartner) === uid;
    }
    if (role === 'customer' && status === 'cancelled' && order.status === 'placed') {
      allowed = String(order.customer) === uid;
    }

    if (!allowed) return res.status(403).json({ error: 'Not allowed for this transition' });

    order.status = status;
    await order.save();
    emitOrderUpdate(order, { event: 'order:status' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delivery partner accepts an order (claims it)
router.patch('/:id/accept-delivery', auth, requireRole('delivery_partner'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.status !== 'ready_for_pickup') return res.status(400).json({ error: 'Not ready for pickup' });
  if (order.deliveryPartner) return res.status(409).json({ error: 'Already taken' });
  order.deliveryPartner = req.user._id;
  await order.save();
  emitOrderUpdate(order, { event: 'order:claimed' });
  res.json(order);
});

// Rate an order
router.patch('/:id/rate', auth, requireRole('customer'), async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (String(order.customer) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Can only rate delivered orders' });
    if (order.customerRating) return res.status(400).json({ error: 'Already rated' });
    order.customerRating = rating;
    order.customerReview = review || '';
    await order.save();
    // Recalculate restaurant rating as moving average
    const ratedOrders = await Order.find({ restaurant: order.restaurant, customerRating: { $ne: null } });
    const avg = ratedOrders.reduce((s, o) => s + o.customerRating, 0) / ratedOrders.length;
    await Restaurant.findByIdAndUpdate(order.restaurant, { rating: Math.round(avg * 10) / 10 });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
