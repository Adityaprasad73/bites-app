import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const { add, cart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => { api.myOrders().then(setOrders).catch(() => setOrders([])); }, []);

  function reorder(o) {
    if (!o.restaurant || !o.items?.length) return;
    const restaurant = { _id: o.restaurant._id, name: o.restaurant.name };

    // If cart already has items from a different restaurant, warn inline
    if (cart.restaurantId && cart.restaurantId !== restaurant._id) {
      if (!window.confirm(`Your cart has items from ${cart.restaurantName}. Replace with items from ${restaurant.name}?`)) return;
    }

    // Add each item from the old order
    o.items.forEach((it) => {
      for (let i = 0; i < it.quantity; i++) {
        add(restaurant, { _id: it._id || it.menuItem, name: it.name, price: it.price });
      }
    });

    toast(`${o.items.length} item${o.items.length !== 1 ? 's' : ''} added to cart!`, 'success');
    navigate('/cart');
  }

  if (orders === null) return <div className="p-10 text-center text-[var(--muted)]">Loading…</div>;

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h1 className="font-display text-4xl font-black">No orders yet</h1>
        <p className="text-[var(--muted)] mt-3">Time to fix that.</p>
        <Link to="/" className="btn btn-primary mt-6 inline-flex">Find food</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-6">Your orders</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o._id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <Link to={`/order/${o._id}`} className="flex-1 min-w-0">
                <p className="font-display text-xl font-bold truncate">{o.restaurant?.name || 'Order'}</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {o.items.length} item{o.items.length !== 1 ? 's' : ''} · ₹{o.total}
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{new Date(o.createdAt).toLocaleString()}</p>
              </Link>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={o.status} />
                {(o.status === 'delivered' || o.status === 'cancelled') && (
                  <button
                    onClick={() => reorder(o)}
                    className="text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-full px-3 py-1 hover:bg-[var(--accent)] hover:text-white transition"
                  >
                    Reorder
                  </button>
                )}
              </div>
            </div>
            {/* Items preview */}
            <div className="mt-3 pt-3 border-t border-[var(--line)]">
              <p className="text-xs text-[var(--muted)] truncate">
                {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
