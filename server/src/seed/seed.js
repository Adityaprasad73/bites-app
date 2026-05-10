import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

async function run() {
  await connectDB(process.env.MONGO_URI);
  console.log('Clearing collections...');
  await Promise.all([User.deleteMany({}), Restaurant.deleteMany({}), MenuItem.deleteMany({}), Order.deleteMany({})]);

  console.log('Creating users...');
  const customer = await User.create({
    name: 'Aarav Customer',
    email: 'customer@demo.com',
    password: 'password',
    role: 'customer',
    address: '12, Connaught Place, Delhi',
    phone: '9990000001',
  });
  const owner = await User.create({
    name: 'Riya Owner',
    email: 'owner@demo.com',
    password: 'password',
    role: 'restaurant_owner',
    phone: '9990000002',
  });
  const partner = await User.create({
    name: 'Karan Partner',
    email: 'partner@demo.com',
    password: 'password',
    role: 'delivery_partner',
    phone: '9990000003',
  });

  console.log('Creating restaurants + menus...');
  const seedData = [
    {
      name: 'Spice Symphony',
      cuisine: 'North Indian',
      description: 'Slow-cooked curries and tandoor classics.',
      image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
      rating: 4.6,
      deliveryTimeMins: 28,
      priceForTwo: 600,
      address: 'Khan Market, Delhi',
      menu: [
        { name: 'Butter Chicken', price: 380, category: 'Mains', isVeg: false, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600' },
        { name: 'Paneer Tikka', price: 320, category: 'Starters', isVeg: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600' },
        { name: 'Garlic Naan', price: 70, category: 'Breads', isVeg: true, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600' },
        { name: 'Dal Makhani', price: 280, category: 'Mains', isVeg: true, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600' },
      ],
    },
    {
      name: 'Sakura Sushi Co.',
      cuisine: 'Japanese',
      description: 'Hand-rolled nigiri, sashimi, and warm ramen.',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
      rating: 4.4,
      deliveryTimeMins: 35,
      priceForTwo: 1200,
      address: 'Greater Kailash, Delhi',
      menu: [
        { name: 'Salmon Nigiri (6 pc)', price: 540, category: 'Sushi', isVeg: false, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600' },
        { name: 'Spicy Tuna Roll', price: 480, category: 'Sushi', isVeg: false, image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600' },
        { name: 'Tonkotsu Ramen', price: 560, category: 'Ramen', isVeg: false, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600' },
        { name: 'Edamame', price: 220, category: 'Sides', isVeg: true, image: 'https://images.unsplash.com/photo-1542367592-8849eb950fd8?w=600' },
      ],
    },
    {
      name: 'Slice & Co.',
      cuisine: 'Italian',
      description: 'Wood-fired pizzas with sourdough crust.',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      rating: 4.3,
      deliveryTimeMins: 25,
      priceForTwo: 800,
      address: 'Hauz Khas Village, Delhi',
      menu: [
        { name: 'Margherita', price: 420, category: 'Pizza', isVeg: true, image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600' },
        { name: 'Pepperoni', price: 540, category: 'Pizza', isVeg: false, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600' },
        { name: 'Truffle Mushroom', price: 620, category: 'Pizza', isVeg: true, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600' },
        { name: 'Tiramisu', price: 280, category: 'Dessert', isVeg: true, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600' },
      ],
    },
    {
      name: 'Bao & Beyond',
      cuisine: 'Pan-Asian',
      description: 'Steamed buns, dumplings, and street-style noodles.',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      rating: 4.5,
      deliveryTimeMins: 30,
      priceForTwo: 700,
      address: 'Cyber Hub, Gurgaon',
      menu: [
        { name: 'Pork Bao (3 pc)', price: 360, category: 'Buns', isVeg: false, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600' },
        { name: 'Veg Dumplings', price: 280, category: 'Dim Sum', isVeg: true, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600' },
        { name: 'Chilli Garlic Noodles', price: 320, category: 'Noodles', isVeg: true, image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600' },
        { name: 'Bubble Tea', price: 180, category: 'Drinks', isVeg: true, image: 'https://images.unsplash.com/photo-1558857563-c0c6ee6ff8bd?w=600' },
      ],
    },
  ];

  for (const r of seedData) {
    const restaurant = await Restaurant.create({
      owner: owner._id,
      name: r.name,
      cuisine: r.cuisine,
      description: r.description,
      image: r.image,
      rating: r.rating,
      deliveryTimeMins: r.deliveryTimeMins,
      priceForTwo: r.priceForTwo,
      address: r.address,
    });
    await MenuItem.insertMany(r.menu.map((m) => ({ ...m, restaurant: restaurant._id })));
  }

  console.log('Done.');
  console.log('Login as:');
  console.log('  customer@demo.com / password');
  console.log('  owner@demo.com / password');
  console.log('  partner@demo.com / password');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
