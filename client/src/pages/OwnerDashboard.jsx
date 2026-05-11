import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const NEXT_ACTIONS = {
  placed: { next: 'accepted', label: 'Accept order' },
  accepted: { next: 'preparing', label: 'Start preparing' },
  preparing: { next: 'ready_for_pickup', label: 'Ready for pickup' },
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [busy, setBusy] = useState({});
  const [tab, setTab] = useState('orders'); // 'orders' | 'menu' | 'analytics'
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [menuItem, setMenuItem] = useState({ name: '', description: '', price: '', category: 'Main Course', isVeg: true, image: '' });
  const [addingItem, setAddingItem] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  async function load() {
    const [o, r] = await Promise.all([api.incomingOrders(), api.myRestaurants()]);
    setOrders(o);
    setRestaurants(r);
    if (r.length > 0 && !selectedRestaurant) setSelectedRestaurant(r[0]);
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
      const msgs = {
        accepted: 'Order accepted!',
        preparing: 'Kitchen started preparing 👨‍🍳',
        ready_for_pickup: 'Order ready for pickup!',
        cancelled: 'Order rejected.',
      };
      toast(msgs[status] || 'Status updated', status === 'cancelled' ? 'error' : 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy((b) => ({ ...b, [orderId]: false }));
    }
  }

  async function toggleOpen(restaurant) {
    setBusy((b) => ({ ...b, [restaurant._id]: true }));
    try {
      const updated = await api.toggleRestaurantOpen(restaurant._id);
      // Update local state without full reload
      setRestaurants((prev) => prev.map((r) => r._id === updated._id ? updated : r));
      if (selectedRestaurant?._id === updated._id) setSelectedRestaurant(updated);
      toast(updated.isOpen ? `${updated.name} is now open!` : `${updated.name} is now closed.`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy((b) => ({ ...b, [restaurant._id]: false }));
    }
  }

  async function loadAnalytics(restaurant) {
    if (!restaurant) return;
    setAnalyticsLoading(true);
    try { setAnalytics(await api.getRestaurantAnalytics(restaurant._id)); }
    catch (e) { toast(e.message, 'error'); }
    finally { setAnalyticsLoading(false); }
  }

  useEffect(() => {
    if (tab === 'analytics' && selectedRestaurant) loadAnalytics(selectedRestaurant);
  }, [tab, selectedRestaurant?._id]);

  async function addItem(e) {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setAddingItem(true);
    try {
      await api.addMenuItem(selectedRestaurant._id, { ...menuItem, price: Number(menuItem.price) });
      toast(`"${menuItem.name}" added to menu!`, 'success');
      setMenuItem({ name: '', description: '', price: '', category: 'Main Course', isVeg: true, image: '' });
      setShowAddItem(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAddingItem(false);
    }
  }

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const past = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl font-black">Restaurant dashboard</h1>
          <p className="text-[var(--muted)] mt-1">{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} · {active.length} active orders</p>
        </div>
        <Link to="/owner/new-restaurant" className="btn btn-primary">+ New restaurant</Link>
      </div>

      {/* Restaurant open/close toggles */}
      {restaurants.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {restaurants.map((r) => (
            <div key={r._id} className="card px-4 py-3 flex items-center gap-3">
              <div>
                <p className="font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-[var(--muted)]">{r.cuisine}</p>
              </div>
              <button
                onClick={() => toggleOpen(r)}
                disabled={busy[r._id]}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  r.isOpen !== false ? 'bg-green-500' : 'bg-[var(--line)]'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  r.isOpen !== false ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-xs font-semibold ${r.isOpen !== false ? 'text-green-600' : 'text-[var(--muted)]'}`}>
                {r.isOpen !== false ? 'Open' : 'Closed'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[var(--line)] p-1 rounded-2xl w-fit">
        {['orders', 'menu', 'analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition ${tab === t ? 'bg-white shadow text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
            {t === 'orders' ? `Orders ${active.length > 0 ? `(${active.length})` : ''}` : t === 'menu' ? 'Manage Menu' : '📊 Analytics'}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          <Section title="Active orders" empty="No active orders right now. 🎉">
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
                  <p className="text-xs text-[var(--muted)] mt-2">📍 {o.address}</p>
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

          <Section title="Order history" empty="Past orders will show up here." className="mt-10">
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
        </>
      )}

      {tab === 'analytics' && (
        <div>
          {restaurants.length === 0 ? (
            <p className="text-[var(--muted)]">Create a restaurant first.</p>
          ) : (
            <>
              {restaurants.length > 1 && (
                <div className="flex gap-2 mb-6 overflow-x-auto">
                  {restaurants.map(r => (
                    <button key={r._id} onClick={() => { setSelectedRestaurant(r); loadAnalytics(r); }}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                        selectedRestaurant?._id === r._id ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white border-[var(--line)]'
                      }`}>{r.name}</button>
                  ))}
                </div>
              )}

              {analyticsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {Array.from({length:4}).map((_,i) => <div key={i} className="card p-5 animate-pulse h-24 bg-[var(--line)]" />)}
                </div>
              ) : analytics ? (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total revenue', value: `₹${analytics.totals.revenue.toLocaleString()}`, icon: '💰' },
                      { label: 'Orders delivered', value: analytics.totals.orders, icon: '📦' },
                      { label: 'Avg order value', value: analytics.totals.orders ? `₹${Math.round(analytics.totals.revenue / analytics.totals.orders)}` : '—', icon: '📊' },
                      { label: 'Rating', value: `★ ${selectedRestaurant?.rating || '—'}`, icon: '⭐' },
                    ].map(s => (
                      <div key={s.label} className="card p-4">
                        <p className="text-xl mb-1">{s.icon}</p>
                        <p className="font-display text-2xl font-black">{s.value}</p>
                        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Revenue chart */}
                  <div className="card p-5 mb-6">
                    <h3 className="font-display text-xl font-bold mb-4">Revenue — last 30 days</h3>
                    {analytics.dailyRevenue.length === 0 ? (
                      <p className="text-[var(--muted)] text-sm text-center py-8">No delivered orders yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={analytics.dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ecddd2" />
                          <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} width={55} />
                          <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} labelFormatter={l => `Date: ${l}`} />
                          <Area type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={2} fill="url(#revGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Top items */}
                  {analytics.topItems.length > 0 && (
                    <div className="card p-5">
                      <h3 className="font-display text-xl font-bold mb-4">Top selling items</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.topItems} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ecddd2" />
                          <XAxis dataKey="_id" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip formatter={(v, n) => [v, n === 'count' ? 'Qty sold' : 'Revenue']} />
                          <Bar dataKey="count" fill="#e11d48" radius={[4,4,0,0]} name="count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>
      )}

      {tab === 'menu' && (
        <div>
          {restaurants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="font-display text-2xl font-bold">No restaurants yet</p>
              <Link to="/owner/new-restaurant" className="btn btn-primary mt-4 inline-flex">Create your first restaurant</Link>
            </div>
          ) : (
            <>
              {restaurants.length > 1 && (
                <div className="flex gap-2 mb-6 overflow-x-auto">
                  {restaurants.map(r => (
                    <button key={r._id} onClick={() => setSelectedRestaurant(r)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                        selectedRestaurant?._id === r._id ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white border-[var(--line)]'
                      }`}>{r.name}</button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold">{selectedRestaurant?.name} — Menu</h2>
                <button onClick={() => setShowAddItem(!showAddItem)} className="btn btn-primary text-sm">
                  {showAddItem ? 'Cancel' : '+ Add item'}
                </button>
              </div>

              {showAddItem && (
                <form onSubmit={addItem} className="card p-5 mb-6 space-y-3">
                  <h3 className="font-semibold text-lg">New menu item</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-sm font-semibold">Item name *</label>
                      <input className="input mt-1" required value={menuItem.name} onChange={e => setMenuItem(m => ({...m, name: e.target.value}))} placeholder="e.g. Butter Chicken" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Price (₹) *</label>
                      <input className="input mt-1" type="number" required min="1" value={menuItem.price} onChange={e => setMenuItem(m => ({...m, price: e.target.value}))} placeholder="350" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Category</label>
                      <select className="input mt-1" value={menuItem.category} onChange={e => setMenuItem(m => ({...m, category: e.target.value}))}>
                        {['Starter', 'Main Course', 'Breads', 'Rice', 'Dessert', 'Beverages', 'Sides'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-semibold">Description</label>
                      <input className="input mt-1" value={menuItem.description} onChange={e => setMenuItem(m => ({...m, description: e.target.value}))} placeholder="Short description" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-semibold">Image URL (optional)</label>
                      <input className="input mt-1" value={menuItem.image} onChange={e => setMenuItem(m => ({...m, image: e.target.value}))} placeholder="https://..." />
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <label className="text-sm font-semibold">Type</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="radio" name="veg" checked={menuItem.isVeg} onChange={() => setMenuItem(m => ({...m, isVeg: true}))} />
                          <span className="text-green-600 font-semibold">🟢 Veg</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="radio" name="veg" checked={!menuItem.isVeg} onChange={() => setMenuItem(m => ({...m, isVeg: false}))} />
                          <span className="text-red-600 font-semibold">🔴 Non-veg</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={addingItem} className="btn btn-primary w-full">
                    {addingItem ? 'Adding…' : 'Add to menu'}
                  </button>
                </form>
              )}

              <p className="text-sm text-[var(--muted)] text-center py-8">
                Menu items are visible to customers browsing your restaurant.
              </p>
            </>
          )}
        </div>
      )}
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
