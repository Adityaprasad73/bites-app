import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useSocket, usePartnerLocation } from '../hooks/useSocket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const DELIVERY_CUT = 0.15;

const VEHICLE_ICONS = { bike: '🏍️', bicycle: '🚲', scooter: '🛵', car: '🚗' };

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">{label}</p>
      <p className={`font-display text-3xl font-black ${accent || ''}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  );
}

function CallButtons({ phone, name }) {
  if (!phone) return null;
  return (
    <div className="flex gap-2 mt-2">
      <a href={`tel:${phone}`}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition">
        📞 Call {name?.split(' ')[0]}
      </a>
      <a href={`https://wa.me/91${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
        💬 WhatsApp
      </a>
    </div>
  );
}

function ActiveOrderCard({ o, busy, onPickup, onDeliver }) {
  const steps = [
    { key: 'ready_for_pickup', label: 'Accepted', icon: '✅' },
    { key: 'out_for_delivery', label: 'Picked up', icon: '📦' },
    { key: 'delivered', label: 'Delivered', icon: '🎉' },
  ];
  const currentIdx = steps.findIndex(s => s.key === o.status);

  return (
    <div className="card border-2 border-[var(--accent)] p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛵</span>
          <div>
            <p className="font-display text-lg font-bold">Active Delivery</p>
            <p className="text-xs text-[var(--muted)]">ORDER #{o._id.slice(-6).toUpperCase()}</p>
          </div>
        </div>
        <p className="text-green-600 font-display font-bold text-lg">+₹{Math.round(o.total * DELIVERY_CUT)}</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-5">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center ${i <= currentIdx ? 'text-[var(--accent)]' : 'text-gray-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${i <= currentIdx ? 'border-[var(--accent)] bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                {i < currentIdx ? '✓' : s.icon}
              </div>
              <p className="text-[10px] mt-1 font-semibold text-center leading-tight">{s.label}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-[var(--accent)]' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Pickup info */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-3">
        <p className="text-xs font-bold text-orange-700 mb-1">📍 PICK UP FROM</p>
        <p className="font-semibold text-sm">{o.restaurant?.name}</p>
        <p className="text-xs text-[var(--muted)]">{o.restaurant?.address}</p>
      </div>

      {/* Drop info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
        <p className="text-xs font-bold text-blue-700 mb-1">🏠 DROP TO</p>
        <p className="font-semibold text-sm">{o.customer?.name}</p>
        <p className="text-xs text-[var(--muted)]">{o.address}</p>
        <CallButtons phone={o.customer?.phone} name={o.customer?.name} />
      </div>

      {/* Items */}
      <div className="border border-[var(--line)] rounded-xl p-3 mb-4">
        <p className="text-xs font-bold text-[var(--muted)] mb-2">🧾 ORDER ITEMS</p>
        {o.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-0.5">
            <span>{item.quantity}× {item.name}</span>
            <span className="text-[var(--muted)]">₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t border-[var(--line)] mt-2 pt-2 flex justify-between text-sm font-bold">
          <span>Total (COD)</span>
          <span>₹{o.total}</span>
        </div>
      </div>

      {/* Actions */}
      {o.status === 'ready_for_pickup' && (
        <button onClick={() => onPickup(o._id)} disabled={busy[o._id]}
          className="btn btn-primary w-full text-sm disabled:opacity-60">
          {busy[o._id] ? 'Updating…' : '📦 Picked up — Start delivery'}
        </button>
      )}
      {o.status === 'out_for_delivery' && (
        <button onClick={() => onDeliver(o._id, o.total)} disabled={busy[o._id]}
          className="btn btn-primary w-full text-sm disabled:opacity-60">
          {busy[o._id] ? 'Updating…' : '🎉 Mark as Delivered'}
        </button>
      )}
    </div>
  );
}

function AvailableOrderCard({ o, busy, onClaim }) {
  return (
    <div className="card p-4 hover:border-[var(--accent)] border border-[var(--line)] transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          {o.restaurant?.image && (
            <img src={o.restaurant.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          )}
          <div>
            <p className="font-display font-bold">{o.restaurant?.name}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">📍 {o.restaurant?.address}</p>
            <p className="text-xs text-[var(--muted)]">🏠 {o.address}</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {o.items?.length} item{o.items?.length !== 1 ? 's' : ''} · For {o.customer?.name}
            </p>
            <CallButtons phone={o.customer?.phone} name={o.customer?.name} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-green-600 font-display font-bold text-lg">+₹{Math.round(o.total * DELIVERY_CUT)}</p>
          <p className="text-xs text-[var(--muted)] mb-2">₹{o.total} order</p>
          <button onClick={() => onClaim(o._id)} disabled={busy[o._id]}
            className="btn btn-primary text-xs px-3 py-2 disabled:opacity-60">
            {busy[o._id] ? '…' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryDashboard() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('live'); // 'live' | 'active' | 'history'
  const [feed, setFeed] = useState({ available: [], mine: [] });
  const [history, setHistory] = useState({ orders: [], stats: {} });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [busy, setBusy] = useState({});
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);

  const load = useCallback(async () => {
    try {
      const data = await api.deliveryFeed();
      setFeed(data);
    } catch (err) { console.error(err); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.deliveryHistory();
      setHistory(data);
      setHistoryLoaded(true);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'history' && !historyLoaded) loadHistory();
  }, [tab, historyLoaded, loadHistory]);

  // Broadcast GPS when actively out for delivery
  const activeDeliveryOrder = feed.mine.find(o => o.status === 'out_for_delivery');
  usePartnerLocation(activeDeliveryOrder?._id, !!activeDeliveryOrder);

  const joins = useMemo(() => {
    const j = [{ event: 'join:delivery_pool', value: true }];
    if (user?._id) j.push({ event: 'join:user', value: user._id });
    return j;
  }, [user?._id]);

  useSocket(joins, () => { load(); if (historyLoaded) loadHistory(); });

  async function toggleOnline() {
    setTogglingOnline(true);
    try {
      const res = await api.toggleOnline();
      setIsOnline(res.isOnline);
      toast(res.isOnline ? '🟢 You are now online' : '🔴 You are now offline', res.isOnline ? 'success' : 'info');
    } catch (err) { toast(err.message, 'error'); }
    finally { setTogglingOnline(false); }
  }

  async function claim(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await api.acceptDelivery(id);
      await load();
      setTab('active');
      toast('Pickup accepted! Head to the restaurant 🛵', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(b => ({ ...b, [id]: false })); }
  }

  async function onPickup(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await api.setStatus(id, 'out_for_delivery');
      await load();
      toast('On the way! Deliver safely 🛵', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(b => ({ ...b, [id]: false })); }
  }

  async function onDeliver(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await api.setStatus(id, 'delivered');
      await load();
      setHistoryLoaded(false); // force refresh history
      setTab('history');
      loadHistory();
      toast('Order delivered! Great job 🎉', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(b => ({ ...b, [id]: false })); }
  }

  const { stats } = history;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header with online toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-black">Deliveries</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">
            {VEHICLE_ICONS[user?.vehicleType || 'bike']} {user?.name}
          </p>
        </div>
        <button onClick={toggleOnline} disabled={togglingOnline}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm border-2 transition ${
            isOnline
              ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
          }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {togglingOnline ? '…' : isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Today" value={stats.todayCount ?? 0} sub="deliveries" />
        <StatCard label="Today's Earn" value={`₹${stats.todayEarnings ?? 0}`} accent="text-green-600" />
        <StatCard label="This Week" value={`₹${stats.weekEarnings ?? 0}`} sub="earnings" />
        <StatCard label="All Time" value={`₹${stats.allTimeEarnings ?? 0}`} sub={`${stats.totalDeliveries ?? 0} orders`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1 mb-6">
        {[
          { key: 'live', label: `Feed`, badge: feed.available.length },
          { key: 'active', label: 'Active', badge: feed.mine.length },
          { key: 'history', label: 'History', badge: null },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.key ? 'bg-white shadow text-[var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}>
            {t.label}
            {t.badge > 0 && (
              <span className="bg-[var(--accent)] text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LIVE FEED TAB */}
      {tab === 'live' && (
        <div>
          {!isOnline && (
            <div className="card p-6 text-center mb-4 border-2 border-dashed border-gray-200">
              <p className="text-3xl mb-2">💤</p>
              <p className="font-semibold mb-1">You're offline</p>
              <p className="text-sm text-[var(--muted)] mb-3">Go online to see available pickups</p>
              <button onClick={toggleOnline} className="btn btn-primary text-sm">Go Online</button>
            </div>
          )}
          {isOnline && feed.available.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-2">😴</p>
              <p className="font-semibold">No pickups right now</p>
              <p className="text-sm text-[var(--muted)] mt-1">New orders will appear here instantly</p>
            </div>
          )}
          {isOnline && (
            <div className="space-y-3">
              {feed.available.map(o => (
                <AvailableOrderCard key={o._id} o={o} busy={busy} onClaim={claim} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE TAB */}
      {tab === 'active' && (
        <div>
          {feed.mine.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="font-semibold">No active deliveries</p>
              <p className="text-sm text-[var(--muted)] mt-1">Accept a pickup from the feed</p>
            </div>
          ) : (
            feed.mine.map(o => (
              <ActiveOrderCard key={o._id} o={o} busy={busy} onPickup={onPickup} onDeliver={onDeliver} />
            ))
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div>
          {/* Earnings breakdown */}
          <div className="card p-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Earnings Breakdown</p>
            <div className="space-y-2">
              {[
                { label: 'Today', value: `₹${stats.todayEarnings ?? 0}` },
                { label: 'This week', value: `₹${stats.weekEarnings ?? 0}` },
                { label: 'All time', value: `₹${stats.allTimeEarnings ?? 0}` },
                { label: 'Total deliveries', value: stats.totalDeliveries ?? 0 },
                { label: 'Avg per delivery', value: `₹${stats.avgPerOrder ?? 0}` },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery list */}
          {history.orders.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-[var(--muted)]">No completed deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.orders.map(o => (
                <div key={o._id} className="card p-4">
                  <div className="flex items-center gap-3">
                    {o.restaurant?.image && (
                      <img src={o.restaurant.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{o.restaurant?.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">🏠 {o.address}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(o.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-600 font-bold text-sm">+₹{Math.round(o.total * DELIVERY_CUT)}</p>
                      <p className="text-xs text-[var(--muted)]">₹{o.total} order</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
