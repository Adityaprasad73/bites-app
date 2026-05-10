import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 grid place-items-center rounded-full bg-[var(--accent)] text-white font-display font-bold">b</span>
          <span className="font-display text-2xl font-bold tracking-tight">bites</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <NavLink to="/" className={({isActive}) => isActive ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}>Browse</NavLink>
          {user?.role === 'customer' && <NavLink to="/orders" className={({isActive}) => isActive ? 'text-[var(--accent)]' : ''}>My orders</NavLink>}
          {user?.role === 'restaurant_owner' && <NavLink to="/owner" className={({isActive}) => isActive ? 'text-[var(--accent)]' : ''}>Restaurant</NavLink>}
          {user?.role === 'delivery_partner' && <NavLink to="/delivery" className={({isActive}) => isActive ? 'text-[var(--accent)]' : ''}>Deliver</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative text-sm font-medium px-3 py-2">
            Cart
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full w-5 h-5 grid place-items-center">{count}</span>
            )}
          </Link>
          {user ? (
            <>
              <span className="text-sm hidden sm:inline text-[var(--muted)]">{user.name}</span>
              <button onClick={() => { logout(); nav('/'); }} className="btn btn-ghost text-sm">Sign out</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary text-sm">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
