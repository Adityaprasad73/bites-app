import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const ROLES = ['customer', 'restaurant_owner', 'delivery_partner', 'admin'];

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'restaurants') loadRestaurants();
    if (tab === 'orders') loadOrders();
  }, [tab]);

  async function loadStats() {
    try { setStats(await api.adminStats()); } catch (e) { toast(e.message, 'error'); }
  }
  async function loadUsers() {
    setLoading(true);
    try { setUsers(await api.adminUsers()); } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }
  async function loadRestaurants() {
    setLoading(true);
    try { setRestaurants(await api.adminRestaurants()); } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }
  async function loadOrders(status = orderFilter) {
    setLoading(true);
    try { setOrders(await api.adminOrders(status)); } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }

  async function changeRole(userId, role) {
    try {
      const updated = await api.adminUpdateUser(userId, { role });
      setUsers(u => u.map(x => x._id === userId ? updated : x));
      toast(`Role updated to ${role}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteUser(userId) {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.adminDeleteUser(userId);
      setUsers(u => u.filter(x => x._id !== userId));
      toast('User deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function toggleRestaurant(r) {
    try {
      const updated = await api.adminUpdateRestaurant(r._id, { isOpen: !r.isOpen });
      setRestaurants(list => list.map(x => x._id === r._id ? updated : x));
      toast(`${updated.name} is now ${updated.isOpen ? 'open' : 'closed'}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteRestaurant(id) {
    if (!window.confirm('Delete this restaurant permanently?')) return;
    try {
      await api.adminDeleteRestaurant(id);
      setRestaurants(r => r.filter(x => x._id !== id));
      toast('Restaurant deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  const TABS = ['overview', 'users', 'restaurants', 'orders'];

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-1">Super admin</p>
        <h1 className="font-display text-4xl font-black">Control panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[var(--line)] p-1 rounded-2xl w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition whitespace-nowrap ${tab === t ? 'bg-white shadow text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total users', value: stats.users, icon: '👤' },
              { label: 'Restaurants', value: stats.restaurants, icon: '🍽️' },
              { label: 'Orders placed', value: stats.orders, icon: '📦' },
              { label: 'Platform revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: '💰' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <p className="text-2xl mb-2">{s.icon}</p>
                <p className="font-display text-3xl font-black">{s.value}</p>
                <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold mb-3">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setTab('users')} className="btn btn-ghost text-sm">Manage users →</button>
              <button onClick={() => setTab('restaurants')} className="btn btn-ghost text-sm">Manage restaurants →</button>
              <button onClick={() => setTab('orders')} className="btn btn-ghost text-sm">View all orders →</button>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div>
          <h2 className="font-display text-2xl font-bold mb-4">All users <span className="text-[var(--muted)] text-lg font-normal">({users.length})</span></h2>
          {loading ? <Spinner /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold hidden md:table-cell">Email</th>
                    <th className="text-left p-4 font-semibold">Role</th>
                    <th className="text-left p-4 font-semibold">Joined</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg)] transition">
                      <td className="p-4 font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-orange-400 grid place-items-center text-white text-xs font-bold shrink-0">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </span>
                          {u.name}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted)] hidden md:table-cell">{u.email}</td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={e => changeRole(u._id, e.target.value)}
                          className="text-xs font-semibold border border-[var(--line)] rounded-full px-2 py-1 bg-white focus:outline-none focus:border-[var(--accent)]"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="p-4 text-[var(--muted)] text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <button onClick={() => deleteUser(u._id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Restaurants */}
      {tab === 'restaurants' && (
        <div>
          <h2 className="font-display text-2xl font-bold mb-4">All restaurants <span className="text-[var(--muted)] text-lg font-normal">({restaurants.length})</span></h2>
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {restaurants.map(r => (
                <div key={r._id} className="card p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--line)] shrink-0">
                      {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-2xl">🍽️</div>}
                    </div>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-[var(--muted)]">{r.cuisine} · {r.address}</p>
                      <p className="text-xs text-[var(--muted)]">Owner: {r.owner?.name} ({r.owner?.email})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.isOpen !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.isOpen !== false ? 'Open' : 'Closed'}
                    </span>
                    <span className="chip">★ {r.rating}</span>
                    <button onClick={() => toggleRestaurant(r)} className="btn btn-ghost text-xs">
                      {r.isOpen !== false ? 'Close' : 'Open'}
                    </button>
                    <button onClick={() => deleteRestaurant(r._id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="font-display text-2xl font-bold">All orders</h2>
            <div className="flex gap-2 flex-wrap">
              {['', 'placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
                <button key={s} onClick={() => { setOrderFilter(s); loadOrders(s); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${orderFilter === s ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white border-[var(--line)]'}`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          {loading ? <Spinner /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                    <th className="text-left p-4 font-semibold">Order</th>
                    <th className="text-left p-4 font-semibold hidden md:table-cell">Customer</th>
                    <th className="text-left p-4 font-semibold hidden md:table-cell">Restaurant</th>
                    <th className="text-left p-4 font-semibold">Total</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg)] transition">
                      <td className="p-4 font-mono text-xs text-[var(--muted)]">#{String(o._id).slice(-6)}</td>
                      <td className="p-4 hidden md:table-cell">{o.customer?.name}</td>
                      <td className="p-4 hidden md:table-cell">{o.restaurant?.name}</td>
                      <td className="p-4 font-semibold">₹{o.total}</td>
                      <td className="p-4"><StatusBadge status={o.status} /></td>
                      <td className="p-4 text-[var(--muted)] text-xs hidden md:table-cell">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <p className="text-center p-8 text-[var(--muted)]">No orders found.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-[var(--line)] rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}
