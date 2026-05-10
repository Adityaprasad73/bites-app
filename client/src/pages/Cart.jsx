import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Cart() {
  const { cart, add, remove, subtotal, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [address, setAddress] = useState(user?.address || '');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const deliveryFee = cart.items.length > 0 ? 30 : 0;
  const total = subtotal + deliveryFee;

  async function checkout() {
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
      });
      clear();
      nav(`/order/${order._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h1 className="font-display text-4xl font-black">Your cart is empty</h1>
        <p className="text-[var(--muted)] mt-3">Pick something delicious to get started.</p>
        <Link to="/" className="btn btn-primary mt-6 inline-flex">Browse restaurants</Link>
      </div>
    );
  }

  // We need restaurant context for the add button; reconstruct minimal object
  const fakeRestaurant = { _id: cart.restaurantId, name: cart.restaurantName };

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-1">Checkout</h1>
      <p className="text-[var(--muted)] mb-8">From <strong>{cart.restaurantName}</strong></p>

      <div className="card p-5 mb-6">
        {cart.items.map((item) => (
          <div key={item._id} className="flex items-center justify-between py-3 border-b last:border-b-0 border-[var(--line)]">
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-[var(--muted)]">₹{item.price} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => remove(item._id)} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--line)] hover:bg-[var(--bg)]">−</button>
              <span className="w-6 text-center font-semibold">{item.quantity}</span>
              <button onClick={() => add(fakeRestaurant, item)} className="w-8 h-8 grid place-items-center rounded-full border border-[var(--line)] hover:bg-[var(--bg)]">+</button>
              <span className="w-20 text-right font-display font-bold">₹{item.price * item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 mb-6">
        <label className="text-sm font-semibold">Delivery address</label>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House no., street, area, landmark"
          className="input mt-2"
        />
      </div>

      <div className="card p-5">
        <Row label="Subtotal" value={`₹${subtotal}`} />
        <Row label="Delivery fee" value={`₹${deliveryFee}`} />
        <div className="border-t border-[var(--line)] my-3" />
        <Row label="Total" value={`₹${total}`} bold />
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <button onClick={checkout} disabled={placing} className="btn btn-primary w-full mt-5 disabled:opacity-60">
          {placing ? 'Placing order…' : `Place order · ₹${total}`}
        </button>
        <p className="text-xs text-[var(--muted)] text-center mt-3">Cash on delivery (this is a demo — no real payment).</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-display font-bold text-lg' : 'text-sm'}`}>
      <span className={bold ? '' : 'text-[var(--muted)]'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
