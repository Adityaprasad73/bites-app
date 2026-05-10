import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      nav(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function quick(email) {
    setEmail(email);
    setPassword('password');
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display text-4xl font-black">Welcome back</h1>
      <p className="text-[var(--muted)] mt-1 mb-8">Sign in to keep ordering.</p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-semibold">Password</label>
          <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>

      <p className="text-sm text-[var(--muted)] mt-4 text-center">
        New here? <Link to="/register" className="font-semibold text-[var(--ink)]">Create an account</Link>
      </p>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2 text-center">Demo accounts</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => quick('customer@demo.com')} className="btn btn-ghost text-xs">Customer</button>
          <button onClick={() => quick('owner@demo.com')} className="btn btn-ghost text-xs">Owner</button>
          <button onClick={() => quick('partner@demo.com')} className="btn btn-ghost text-xs">Partner</button>
        </div>
        <p className="text-xs text-[var(--muted)] mt-2 text-center">All use password: <code>password</code></p>
      </div>
    </div>
  );
}
