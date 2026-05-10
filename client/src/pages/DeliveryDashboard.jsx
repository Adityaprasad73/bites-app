import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [feed, setFeed] = useState({ available: [], mine: [] });
  const [busy, setBusy] = useState({});

  async function load() {
    const data = await api.deliveryFeed();
    setFeed(data);
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
    try { await api.acceptDelivery(id); await load(); }
    catch (err) { alert(err.message); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  }

  async function transition(id, status) {
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.setStatus(id, status); await load(); }
    catch (err) { alert(err.message); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-2">Deliver</h1>
      <p className="text-[var(--muted)] mb-8">{feed.available.length} order{feed.available.length !== 1 ? 's' : ''} ready · {feed.mine.length} in progress</p>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Available pickups</h2>
        {feed.available.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">Nothing right now. Hang tight.</p>
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
                  <button onClick={() => claim(o._id)} disabled={busy[o._id]} className="btn btn-primary text-sm">
                    {busy[o._id] ? '…' : 'Accept pickup'}
                  </button>
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
                <div className="flex justify-end gap-2">
                  {o.status === 'ready_for_pickup' && (
                    <button onClick={() => transition(o._id, 'out_for_delivery')} disabled={busy[o._id]} className="btn btn-primary text-sm">
                      Picked up — start delivery
                    </button>
                  )}
                  {o.status === 'out_for_delivery' && (
                    <button onClick={() => transition(o._id, 'delivered')} disabled={busy[o._id]} className="btn btn-primary text-sm">
                      Mark delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
