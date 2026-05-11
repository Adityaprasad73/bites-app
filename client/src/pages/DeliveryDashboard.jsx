import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

// Delivery partner earns 15% of order total (configurable)
const DELIVERY_CUT = 0.15;

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [feed, setFeed] = useState({ available: [], mine: [] });
  const [completed, setCompleted] = useState([]);
  const [busy, setBusy] = useState({});

  async function load() {
    const data = await api.deliveryFeed();
    setFeed(data);
    // Track completed deliveries from "mine" that just became delivered
    if (data.delivered) setCompleted(data.delivered);
  }

  useEffect(() => { load().catch(console.error); }, []);

  const joins = useMemo(() => {
    const j = [{ event: 'join:delivery_pool', value: true }];
    if (user?._id) j.push({ event: 'join:user', value: user._id });
    return j;
  }, [user?._id]);

  useSocket(joins, () => { load(); });

  async function claim(id) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.acceptDelivery(id);
      await load();
      toast('Pickup accepted! Head to the restaurant.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function transition(id, status) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.setStatus(id, status);
      await load();
      if (status === 'out_for_delivery') toast('On the way! Deliver safely 🛵', 'success');
      if (status === 'delivered') toast('Order delivered! Great job 🎉', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  // Earnings from localStorage (persisted per session)
  const [earnings, setEarnings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('delivery_earnings_v1')) || { count: 0, total: 0 }; }
    catch { return { count: 0, total: 0 }; }
  });

  // When an order transitions to delivered, bump earnings
  useEffect(() => {
    const key = 'delivery_delivered_ids_v1';
    const seen = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    // We don't have a delivered list from the feed, but we track when WE mark delivered
    // This is handled in the transition function below by storing IDs
    localStorage.setItem(key, JSON.stringify([...seen]));
  }, []);

  async function markDelivered(id, total) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.setStatus(id, 'delivered');
      await load();
      // Update earnings
      const key = 'delivery_delivered_ids_v1';
      const seen = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
      if (!seen.has(id)) {
        seen.add(id);
        localStorage.setItem(key, JSON.stringify([...seen]));
        const newEarnings = { count: earnings.count + 1, total: earnings.total + Math.round(total * DELIVERY_CUT) };
        setEarnings(newEarnings);
        localStorage.setItem('delivery_earnings_v1', JSON.stringify(newEarnings));
      }
      toast('Order delivered! Great job 🎉', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-2">Deliver</h1>
      <p className="text-[var(--muted)] mb-6">{feed.available.length} order{feed.available.length !== 1 ? 's' : ''} ready · {feed.mine.length} in progress</p>

      {/* Earnings card */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">Today's deliveries</p>
          <p className="font-display text-4xl font-black">{earnings.count}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">Estimated earnings</p>
          <p className="font-display text-4xl font-black text-green-600">₹{earnings.total}</p>
        </div>
        <div className="card p-5 col-span-2 md:col-span-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 grid place-items-center text-xl">🛵</div>
          <div>
            <p className="text-xs text-[var(--muted)]">Delivery cut</p>
            <p className="font-semibold">{(DELIVERY_CUT * 100).toFixed(0)}% per order</p>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Available pickups</h2>
        {feed.available.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">😴</p>
            <p className="text-[var(--muted)] text-sm">Nothing right now. Hang tight.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.available.map((o) => (
              <div key={o._id} className="card p-5">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-display text-lg font-bold">{o.restaurant?.name}</p>
                    <p className="text-sm text-[var(--muted)]">→ {o.address}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">For {o.customer?.name} · ₹{o.total}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600 font-semibold mb-1">+₹{Math.round(o.total * DELIVERY_CUT)} earn</p>
                    <button onClick={() => claim(o._id)} disabled={busy[o._id]} className="btn btn-primary text-sm">
                      {busy[o._id] ? '…' : 'Accept pickup'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold mb-3">Your active deliveries</h2>
        {feed.mine.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">You're not on a delivery yet.</p>
        ) : (
          <div className="space-y-3">
            {feed.mine.map((o) => (
              <div key={o._id} className="card p-5">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-display text-lg font-bold">{o.restaurant?.name}</p>
                    <p className="text-sm">📍 Pick up: {o.restaurant?.address}</p>
                    <p className="text-sm">🏠 Drop: {o.address}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">{o.customer?.name} {o.customer?.phone && `· ${o.customer.phone}`}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="border-t border-[var(--line)] my-3" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-green-600 font-semibold">+₹{Math.round(o.total * DELIVERY_CUT)} on delivery</p>
                  <div className="flex justify-end gap-2">
                    {o.status === 'ready_for_pickup' && (
                      <button onClick={() => transition(o._id, 'out_for_delivery')} disabled={busy[o._id]} className="btn btn-primary text-sm">
                        Picked up — start delivery
                      </button>
                    )}
                    {o.status === 'out_for_delivery' && (
                      <button onClick={() => markDelivered(o._id, o.total)} disabled={busy[o._id]} className="btn btn-primary text-sm">
                        Mark delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
