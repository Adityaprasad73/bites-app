import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display text-4xl font-black">Create your account</h1>
      <p className="text-[var(--muted)] mt-1 mb-8">Eat well. Order more.</p>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <Field label="Name" value={form.name} onChange={(v) => up('name', v)} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => up('email', v)} />
        <Field label="Password" type="password" value={form.password} onChange={(v) => up('password', v)} />
        <Field label="Phone" value={form.phone} onChange={(v) => up('phone', v)} required={false} />
        <div>
          <label className="text-sm font-semibold">I am a…</label>
          <select className="input mt-1" value={form.role} onChange={(e) => up('role', e.target.value)}>
            <option value="customer">Customer</option>
            <option value="restaurant_owner">Restaurant owner</option>
            <option value="delivery_partner">Delivery partner</option>
          </select>
        </div>
        {form.role === 'customer' && (
          <Field label="Default delivery address" value={form.address} onChange={(v) => up('address', v)} required={false} />
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="text-sm text-[var(--muted)] mt-4 text-center">
        Already have one? <Link to="/login" className="font-semibold text-[var(--ink)]">Sign in</Link>
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = true }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input className="input mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
