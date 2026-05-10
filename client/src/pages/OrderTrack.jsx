import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import StatusBadge from '../components/StatusBadge.jsx';

const STAGES = [
  { key: 'placed', label: 'Order placed' },
  { key: 'accepted', label: 'Restaurant accepted' },
  { key: 'preparing', label: 'Cooking up' },
  { key: 'ready_for_pickup', label: 'Ready for pickup' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];

function indexOfStatus(s) {
  const idx = STAGES.findIndex((x) => x.key === s);
  return idx === -1 ? 0 : idx;
}

export default function OrderTrack() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.getOrder(id).then(setOrder).catch(() => setOrder(false));
  }, [id]);

  const joins = useMemo(() => {
    const j = [{ event: 'join:order', value: id }];
    if (user?._id) j.push({ event: 'join:user', value: user._id });
    return j;
  }, [id, user?._id]);

  useSocket(joins, (payload) => {
    if (payload?.order?._id === id) {
      // populated fields may be lost in socket payload; merge to keep restaurant/customer info
      setOrder((prev) => prev ? { ...prev, ...payload.order } : payload.order);
    }
  });

  if (order === null) return <div className="p-10 text-center text-[var(--muted)]">Loading order…</div>;
  if (order === false) return <div className="p-10 text-center text-[var(--muted)]">Order not found.</div>;

  const stageIdx = indexOfStatus(order.status);
  const cancelled = order.status === 'cancelled';

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
                  <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 z-10 transition
                    ${done ? 'bg-[var(--accent)] text-white' :
                      active ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent)]/20 pulse-dot' :
                      'bg-white border border-[var(--line)] text-[var(--muted)]'}`}>
                    {done ? '✓' : idx + 1}
                  </span>
                  <div className="pt-1">
                    <p className={`font-semibold ${active ? '' : done ? '' : 'text-[var(--muted)]'}`}>{stage.label}</p>
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

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? 'font-display font-bold text-base' : 'text-sm text-[var(--muted)]'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
