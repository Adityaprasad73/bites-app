import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api/client.js';

// Demo promo codes
const PROMOS = {
  BITES10: { type: 'percent', value: 10, label: '10% off' },
  BITES20: { type: 'percent', value: 20, label: '20% off' },
  FIRST50: { type: 'flat',    value: 50, label: '₹50 off' },
  FREESHIP: { type: 'ship',   value: 0,  label: 'Free delivery' },
};

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Cart() {
  const { cart, add, remove, subtotal, clear } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [address, setAddress] = useState(user?.address || '');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [payMode, setPayMode] = useState('cod'); // 'cod' | 'online'

  const promo = promoCode ? PROMOS[promoCode] : null;
  const deliveryFee = cart.items.length > 0 ? (promo?.type === 'ship' ? 0 : 30) : 0;
  const discount = promo
    ? promo.type === 'percent' ? Math.round(subtotal * promo.value / 100)
    : promo.type === 'flat' ? Math.min(promo.value, subtotal)
    : 0
    : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (PROMOS[code]) {
      setPromoCode(code);
      setPromoError('');
      toast(`Promo applied: ${PROMOS[code].label}!`, 'success');
    } else {
      setPromoError('Invalid promo code');
    }
  }

  async function placeOrder(paymentId = null) {
    setError('');
    if (!user) { nav('/login?next=/cart'); return; }
    if (user.role !== 'customer') { setError('Only customers can place orders.'); return; }
    if (!address.trim()) { setError('Add a delivery address.'); return; }
    setPlacing(true);
    try {
      const order = await api.placeOrder({
        restaurantId: cart.restaurantId,
        items: cart.items.map((i) => ({ menuItemId: i._id, quantity: i.quantity })),
        address,
        promoCode: promoCode || undefined,
        paymentId: paymentId || undefined,
      });
      clear();
      toast('Order placed successfully! 🎉', 'success');
      nav(`/order/${order._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  async function handleOnlinePayment() {
    setError('');
    if (!user) { nav('/login?next=/cart'); return; }
    if (!address.trim()) { setError('Add a delivery address.'); return; }

    const loaded = await loadRazorpay();
    if (!loaded) { setError('Failed to load payment gateway. Try again.'); return; }

    setPlacing(true);
    try {
      const rzOrder = await api.createPaymentOrder(total);

      const options = {
        key: rzOrder.keyId,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        name: 'Bites',
        description: `Order from ${cart.restaurantName}`,
        order_id: rzOrder.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: '#e11d48' },
        handler: async (response) => {
          try {
            await api.verifyPayment(response);
            await placeOrder(response.razorpay_payment_id);
          } catch (err) {
            setError('Payment verification failed. Contact support.');
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            toast('Payment cancelled', 'error');
          },
        },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  async function checkout() {
    if (payMode === 'online') {
      await handleOnlinePayment();
    } else {
      await placeOrder();
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <p className="text-6xl mb-4">🛒</p>
        <h1 className="font-display text-4xl font-black">Your cart is empty</h1>
        <p className="text-[var(--muted)] mt-3">Pick something delicious to get started.</p>
        <Link to="/" className="btn btn-primary mt-6 inline-flex">Browse restaurants</Link>
      </div>
    );
  }

  const fakeRestaurant = { _id: cart.restaurantId, name: cart.restaurantName };

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-1">Checkout</h1>
      <p className="text-[var(--muted)] mb-8">From <strong>{cart.restaurantName}</strong></p>

      {/* Items */}
      <div className="card p-5 mb-6">
        {cart.items.map((item) => (
          <div key={item._id} className="flex items-center justify-between py-3 border-b last:border-b-0 border-[var(--line)]">
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-[var(--muted)]">₹{item.price} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => remove(item._id)} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--line)] hover:bg-[var(--bg)] text-lg">−</button>
              <span className="w-6 text-center font-semibold">{item.quantity}</span>
              <button onClick={() => add(fakeRestaurant, item)} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--line)] hover:bg-[var(--bg)] text-lg">+</button>
              <span className="w-20 text-right font-display font-bold">₹{item.price * item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Address */}
      <div className="card p-5 mb-6">
        <label className="text-sm font-semibold">📍 Delivery address</label>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House no., street, area, landmark"
          className="input mt-2"
        />
      </div>

      {/* Promo code */}
      <div className="card p-5 mb-6">
        <label className="text-sm font-semibold mb-2 block">🏷️ Promo code</label>
        {promo ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold text-green-700">{promoCode}</p>
              <p className="text-xs text-green-600">{promo.label} applied!</p>
            </div>
            <button onClick={() => { setPromoCode(''); setPromoInput(''); }} className="text-xs text-red-500 font-semibold">Remove</button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value); setPromoError(''); }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder="Enter code (e.g. BITES10)"
                className="input flex-1 uppercase"
              />
              <button onClick={applyPromo} className="btn btn-ghost text-sm shrink-0">Apply</button>
            </div>
            {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
            <p className="text-xs text-[var(--muted)] mt-2">Try: BITES10 · BITES20 · FIRST50 · FREESHIP</p>
          </div>
        )}
      </div>

      {/* Payment mode */}
      <div className="card p-5 mb-6">
        <label className="text-sm font-semibold mb-3 block">💳 Payment method</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'cod', label: 'Cash on delivery', icon: '💵' },
            { key: 'online', label: 'Pay online', icon: '🔒', sub: 'Razorpay' },
          ].map(m => (
            <button key={m.key} onClick={() => setPayMode(m.key)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition ${
                payMode === m.key ? 'border-[var(--accent)] bg-red-50' : 'border-[var(--line)] bg-white hover:border-[var(--accent)]/40'
              }`}>
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="font-semibold text-sm">{m.label}</p>
                {m.sub && <p className="text-xs text-[var(--muted)]">{m.sub}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary + CTA */}
      <div className="card p-5">
        <Row label="Subtotal" value={`₹${subtotal}`} />
        {discount > 0 && <Row label={`Promo (${promoCode})`} value={`−₹${discount}`} green />}
        <Row label={promo?.type === 'ship' ? 'Delivery fee' : 'Delivery fee'} value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`} green={deliveryFee === 0} />
        <div className="border-t border-[var(--line)] my-3" />
        <Row label="Total" value={`₹${total}`} bold />

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button onClick={checkout} disabled={placing} className="btn btn-primary w-full mt-5 disabled:opacity-60 text-base">
          {placing ? 'Processing…' : payMode === 'online' ? `Pay ₹${total} securely` : `Place order · ₹${total}`}
        </button>

        {payMode === 'cod' && (
          <p className="text-xs text-[var(--muted)] text-center mt-3">Cash on delivery — pay when your order arrives.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, green }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-display font-bold text-lg' : 'text-sm'} ${green ? 'text-green-600' : ''}`}>
      <span className={bold || green ? '' : 'text-[var(--muted)]'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
