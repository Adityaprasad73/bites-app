import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket, usePartnerLocationReceiver } from '../hooks/useSocket.js';
import { useToast } from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const DeliveryMap = lazy(() => import('../components/DeliveryMap.jsx'));

const STAGES = [
  { key: 'placed',           label: 'Order placed',         icon: '📋' },
  { key: 'accepted',         label: 'Restaurant accepted',  icon: '✅' },
  { key: 'preparing',        label: 'Cooking up',           icon: '👨‍🍳' },
  { key: 'ready_for_pickup', label: 'Ready for pickup',     icon: '📦' },
  { key: 'out_for_delivery', label: 'On the way',           icon: '🛵' },
  { key: 'delivered',        label: 'Delivered',            icon: '🎉' },
];

function indexOfStatus(s) {
  const idx = STAGES.findIndex((x) => x.key === s);
  return idx === -1 ? 0 : idx;
}

export default function OrderTrack() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [rated, setRated] = useState(false);
  const [partnerPos, setPartnerPos] = useState(null);

  // Listen for live partner GPS updates
  usePartnerLocationReceiver(id, (pos) => setPartnerPos(pos));

  useEffect(() => {
    api.getOrder(id).then(o => {
      setOrder(o);
      if (o.customerRating) { setRated(true); setRating(o.customerRating); }
    }).catch(() => setOrder(false));
  }, [id]);

  const joins = useMemo(() => {
    const j = [{ event: 'join:order', value: id }];
    if (user?._id) j.push({ event: 'join:user', value: user._id });
    return j;
  }, [id, user?._id]);

  useSocket(joins, (payload) => {
    if (payload?.order?._id === id) {
      setOrder((prev) => prev ? { ...prev, ...payload.order } : payload.order);
    }
  });

  async function submitRating() {
    if (!rating) return;
    setSubmittingRating(true);
    try {
      await api.rateOrder(id, { rating, review });
      setRated(true);
      toast('Thanks for your review! 🌟', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmittingRating(false);
    }
  }

  if (order === null) return <div className="p-10 text-center text-[var(--muted)]">Loading order…</div>;
  if (order === false) return <div className="p-10 text-center text-[var(--muted)]">Order not found.</div>;

  const stageIdx = indexOfStatus(order.status);
  const cancelled = order.status === 'cancelled';
  const delivered = order.status === 'delivered';

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Order #{String(order._id).slice(-6)}</p>
          <h1 className="font-display text-4xl font-black mt-1">{order.restaurant?.name || 'Your order'}</h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {!cancelled ? (
        <div className="card p-6 mb-6">
          <ol className="relative">
            {STAGES.map((stage, idx) => {
              const done = idx < stageIdx;
              const active = idx === stageIdx;
              return (
                <li key={stage.key} className="flex items-start gap-4 pb-6 last:pb-0 relative">
                  {idx < STAGES.length - 1 && (
                    <span className={`absolute left-[15px] top-8 bottom-0 w-px ${done ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} />
                  )}
                  <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 z-10 text-sm transition
                    ${done ? 'bg-[var(--accent)] text-white' :
                      active ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent)]/20 pulse-dot' :
                      'bg-white border border-[var(--line)] text-[var(--muted)]'}`}>
                    {done ? '✓' : active ? stage.icon : idx + 1}
                  </span>
                  <div className="pt-1">
                    <p className={`font-semibold ${!done && !active ? 'text-[var(--muted)]' : ''}`}>{stage.label}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {order.statusHistory?.find((h) => h.status === stage.key)?.at
                        ? new Date(order.statusHistory.find((h) => h.status === stage.key).at).toLocaleTimeString()
                        : active ? 'In progress…' : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="card p-6 mb-6 bg-red-50 border-red-200">
          <p className="font-semibold text-red-800">This order was cancelled.</p>
          <Link to="/" className="btn btn-ghost text-sm mt-3 inline-flex">Browse restaurants</Link>
        </div>
      )}

      {/* Live map — shows from accepted onwards */}
      {!cancelled && order.status !== 'placed' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl font-bold">
              {order.status === 'out_for_delivery' ? '🛵 Live tracking' : '📍 Delivery route'}
            </h2>
            {order.status === 'out_for_delivery' && partnerPos && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Partner live
              </span>
            )}
          </div>
          <Suspense fallback={<div className="h-[320px] rounded-2xl bg-[var(--line)] animate-pulse" />}>
            <DeliveryMap
              restaurant={order.restaurant}
              customerAddress={order.address}
              partnerPos={partnerPos}
              status={order.status}
            />
          </Suspense>
        </div>
      )}

      {/* Rating section — shows after delivery */}
      {delivered && user?.role === 'customer' && (
        <div className="card p-6 mb-6">
          {rated ? (
            <div className="text-center py-2">
              <p className="text-3xl mb-2">🌟</p>
              <p className="font-display text-xl font-bold">Thanks for rating!</p>
              <div className="flex justify-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`text-2xl ${s <= rating ? 'text-yellow-400' : 'text-[var(--line)]'}`}>★</span>
                ))}
              </div>
              {review && <p className="text-sm text-[var(--muted)] mt-2 italic">"{review}"</p>}
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold mb-1">Rate your order</h2>
              <p className="text-sm text-[var(--muted)] mb-4">How was the food from {order.restaurant?.name}?</p>
              {/* Stars */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl transition-transform hover:scale-110 active:scale-95"
                  >
                    <span className={(hoverRating || rating) >= s ? 'text-yellow-400' : 'text-[var(--line)]'}>★</span>
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 self-center text-sm font-semibold text-[var(--muted)]">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                  </span>
                )}
              </div>
              {/* Review */}
              <textarea
                rows={2}
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Tell us more (optional)…"
                className="input text-sm mb-4"
              />
              <button
                onClick={submitRating}
                disabled={!rating || submittingRating}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {submittingRating ? 'Submitting…' : 'Submit review'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="font-display text-xl font-bold mb-3">Items</h2>
        <ul className="space-y-2">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>{it.quantity} × {it.name}</span>
              <span>₹{it.price * it.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--line)] my-3" />
        <Row label="Subtotal" value={`₹${order.subtotal}`} />
        {order.discount > 0 && <Row label="Discount" value={`−₹${order.discount}`} className="text-green-600" />}
        <Row label="Delivery" value={`₹${order.deliveryFee}`} />
        <Row label="Total" value={`₹${order.total}`} bold />
      </div>

      <div className="card p-6 text-sm">
        <p className="text-[var(--muted)] uppercase tracking-widest text-xs mb-1">Delivering to</p>
        <p>{order.address}</p>
        {order.deliveryPartner && (
          <>
            <p className="text-[var(--muted)] uppercase tracking-widest text-xs mt-4 mb-1">Delivery partner</p>
            <p>{order.deliveryPartner.name} {order.deliveryPartner.phone && `· ${order.deliveryPartner.phone}`}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, className = '' }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? 'font-display font-bold text-base' : 'text-sm text-[var(--muted)]'} ${className}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
