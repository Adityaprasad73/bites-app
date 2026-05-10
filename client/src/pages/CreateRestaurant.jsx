import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function CreateRestaurant() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '', cuisine: '', address: '', image: '',
    description: '', priceForTwo: '', deliveryTimeMins: '30',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function up(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createRestaurant({
        ...form,
        priceForTwo: Number(form.priceForTwo),
        deliveryTimeMins: Number(form.deliveryTimeMins),
      });
      nav('/owner');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <button onClick={() => nav('/owner')} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] mb-6 flex items-center gap-1">
        ← Back to dashboard
      </button>

      <h1 className="font-display text-4xl font-black mb-2">New restaurant</h1>
      <p className="text-[var(--muted)] mb-8">Fill in your restaurant details — you can add menu items after.</p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <Field label="Restaurant name *" value={form.name} onChange={v => up('name', v)} placeholder="e.g. The Spice Kitchen" />
        <Field label="Cuisine type *" value={form.cuisine} onChange={v => up('cuisine', v)} placeholder="e.g. Indian, Italian, Chinese" />
        <Field label="Address *" value={form.address} onChange={v => up('address', v)} placeholder="Full address" />
        <Field label="Description" value={form.description} onChange={v => up('description', v)} placeholder="A short tagline or description" required={false} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Price for two (₹)</label>
            <input className="input mt-1" type="number" min="0" value={form.priceForTwo} onChange={e => up('priceForTwo', e.target.value)} placeholder="400" />
          </div>
          <div>
            <label className="text-sm font-semibold">Delivery time (mins)</label>
            <input className="input mt-1" type="number" min="5" value={form.deliveryTimeMins} onChange={e => up('deliveryTimeMins', e.target.value)} placeholder="30" />
          </div>
        </div>

        <Field label="Cover image URL (optional)" value={form.image} onChange={v => up('image', v)} placeholder="https://images.unsplash.com/..." required={false} />

        {form.image && (
          <div className="rounded-xl overflow-hidden h-40 bg-[var(--line)]">
            <img src={form.image} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Creating…' : 'Create restaurant'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required = true }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input
        className="input mt-1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
