import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'cart_v1';

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { restaurantId: null, restaurantName: '', items: [] }; }
    catch { return { restaurantId: null, restaurantName: '', items: [] }; }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(cart)); }, [cart]);

  function add(restaurant, item) {
    setCart((prev) => {
      // If switching restaurants, replace cart
      if (prev.restaurantId && prev.restaurantId !== restaurant._id) {
        if (!confirm(`Your cart has items from ${prev.restaurantName}. Clear it and add from ${restaurant.name}?`)) {
          return prev;
        }
        return { restaurantId: restaurant._id, restaurantName: restaurant.name, items: [{ ...item, quantity: 1 }] };
      }
      const existing = prev.items.find((i) => i._id === item._id);
      const items = existing
        ? prev.items.map((i) => (i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev.items, { ...item, quantity: 1 }];
      return { restaurantId: restaurant._id, restaurantName: restaurant.name, items };
    });
  }

  function remove(itemId) {
    setCart((prev) => {
      const items = prev.items
        .map((i) => (i._id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      if (items.length === 0) return { restaurantId: null, restaurantName: '', items: [] };
      return { ...prev, items };
    });
  }

  function clear() {
    setCart({ restaurantId: null, restaurantName: '', items: [] });
  }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, add, remove, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() { return useContext(CartContext); }
