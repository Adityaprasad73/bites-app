import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const NEXT_ACTIONS = {
  placed: { next: 'accepted', label: 'Accept order' },
  accepted: { next: 'preparing', label: 'Start preparing' },
  preparing: { next: 'ready_for_pickup', label: 'Ready for pickup' },
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [busy, setBusy] = useState({});

  async function load() {
    const [o, r] = await Promise.all([api.incomingOrders(), api.myRestaurants()]);
    setOrders(o);
    setRestaurants(r);
  }
  useEffect(() => { load().catch(console.error); }, []);

  const joins = useMemo(() => {
    const j = [];
    restaurants.forEach((r) => j.push({ event: 'join:restaurant', value: r._id }));
    if (user?._id) j.push({ event: 'join:user', value: user._id });
    return j;
  }, [restaurants, user?._id]);

  useSocket(joins, () => { load(); });

  async function transition(orderId, status) {
    setBusy((b) => ({ ...b, [orderId]: true }));
    try {
      await api.setStatus(orderId, status);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy((b) => ({ ...b, [orderId]: false }));
    }
  }

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const past = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-2">Restaurant dashboard</h1>
      <p className="text-[var(--muted)] mb-8">{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} · {active.length} active orders</p>

      <Section title="Active orders" empty="No active orders right now.">
        {active.map((o) => {
          const action = NEXT_ACTIONS[o.status];
          return (
            <div key={o._id} className="card p-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <p className="font-display text-lg font-bold">#{String(o._id).slice(-6)} · {o.customer?.name}</p>
                  <p className="text-xs text-[var(--muted)]">{o.restaurant?.name} · {new Date(o.createdAt).toLocaleTimeString()}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <ul className="mt-3 text-sm space-y-1">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{it.quantity} × {it.name}</span>
                    <span className="text-[var(--muted)]">₹{it.price * it.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[var(--line)] my-3" />
              <div className="flex items-center justify-between">
                <p className="text-sm">Total: <span className="font-display font-bold">₹{o.total}</span></p>
                <div className="flex gap-2">
                  {o.status === 'placed' && (
                    <button onClick={() => transition(o._id, 'cancelled')} disabled={busy[o._id]} className="btn btn-ghost text-sm">Reject</button>
                  )}
                  {action && (
                    <button onClick={() => transition(o._id, action.next)} disabled={busy[o._id]} className="btn btn-primary text-sm">
                      {busy[o._id] ? '…' : action.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="History" empty="Past orders will show up here." className="mt-10">
        {past.slice(0, 10).map((o) => (
          <div key={o._id} className="card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">#{String(o._id).slice(-6)} · {o.customer?.name}</p>
              <p className="text-xs text-[var(--muted)]">₹{o.total} · {new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <StatusBadge status={o.status} />
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children, className = '' }) {
  const arr = Array.isArray(children) ? children : [children];
  const hasContent = arr.some((c) => c && c !== false);
  return (
    <section className={className}>
      <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
      {hasContent ? <div className="space-y-3">{children}</div> : <p className="text-[var(--muted)] text-sm">{empty}</p>}
    </section>
  );
}
