import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  customer: '🛍️ Customer',
  restaurant_owner: '🍽️ Restaurant Owner',
  delivery_partner: '🚴 Delivery Partner',
  admin: '🔧 Admin',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  function handleLogout() {
    logout();
    nav('/');
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-black mb-8">Your profile</h1>

      {/* Avatar + name */}
      <div className="card p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)] to-orange-400 flex items-center justify-center text-white font-display text-2xl font-black shrink-0">
          {user.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-display text-2xl font-bold">{user.name}</p>
          <p className="text-sm text-[var(--muted)]">{user.email}</p>
          <span className="chip mt-1">{ROLE_LABELS[user.role] || user.role}</span>
        </div>
      </div>

      {/* Info */}
      <div className="card p-6 mb-5 space-y-4">
        <h2 className="font-semibold text-lg">Account details</h2>
        <InfoRow label="Full name" value={user.name} />
        <InfoRow label="Email" value={user.email} />
        {user.phone && <InfoRow label="Phone" value={user.phone} />}
        {user.address && <InfoRow label="Default address" value={user.address} />}
        <InfoRow label="Role" value={ROLE_LABELS[user.role] || user.role} />
      </div>

      {/* Role-specific quick links */}
      <div className="card p-6 mb-5">
        <h2 className="font-semibold text-lg mb-4">Quick links</h2>
        <div className="space-y-2">
          {user.role === 'customer' && (
            <QuickLink to="/orders" label="📋 My orders" sub="View your order history" onClick={() => nav('/orders')} />
          )}
          {user.role === 'restaurant_owner' && (
            <>
              <QuickLink label="🏪 My dashboard" sub="Manage orders and menu" onClick={() => nav('/owner')} />
              <QuickLink label="➕ New restaurant" sub="List a new restaurant" onClick={() => nav('/owner/new-restaurant')} />
            </>
          )}
          {user.role === 'delivery_partner' && (
            <QuickLink label="🚴 Delivery feed" sub="Pick up available orders" onClick={() => nav('/delivery')} />
          )}
          <QuickLink label="🏠 Browse restaurants" sub="Find something delicious" onClick={() => nav('/')} />
        </div>
      </div>

      {/* Sign out */}
      <div className="card p-6">
        <h2 className="font-semibold text-lg mb-1">Sign out</h2>
        <p className="text-sm text-[var(--muted)] mb-4">You'll need to sign in again to place orders.</p>
        <button onClick={handleLogout} className="btn btn-ghost text-[var(--accent)] border-[var(--accent)] w-full">
          Sign out
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[var(--line)] last:border-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function QuickLink({ label, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg)] transition text-left border border-[var(--line)]">
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-[var(--muted)]">{sub}</p>
      </div>
      <span className="text-[var(--muted)]">→</span>
    </button>
  );
}
