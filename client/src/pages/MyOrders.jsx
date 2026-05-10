import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.myOrders().then(setOrders).catch(() => setOrders([])); }, []);

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
          <Link key={o._id} to={`/order/${o._id}`} className="card p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl font-bold">{o.restaurant?.name || 'Order'}</p>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                {o.items.length} item{o.items.length !== 1 ? 's' : ''} · ₹{o.total} · {new Date(o.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={o.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
