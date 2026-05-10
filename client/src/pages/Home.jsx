import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Home() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.listRestaurants(q).then((data) => {
        if (!cancelled) { setList(data); setLoading(false); }
      }).catch(() => setLoading(false));
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      {/* hero */}
      <section className="relative mb-10 rounded-3xl overflow-hidden bg-gradient-to-br from-[#fff1eb] via-[#ffe4d6] to-[#ffd4c1] p-10 md:p-14">
        <div className="absolute inset-0 opacity-30 mix-blend-multiply" style={{backgroundImage:"radial-gradient(circle at 20% 20%, #fb923c33, transparent 40%), radial-gradient(circle at 80% 60%, #f43f5e33, transparent 40%)"}} />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Hungry? Same.</p>
          <h1 className="font-display text-5xl md:text-7xl font-black leading-[0.95] tracking-tight max-w-3xl">
            Food worth <em className="italic">crossing town</em> for — at your door.
          </h1>
          <p className="mt-5 text-[var(--muted)] max-w-xl text-lg">
            Browse local kitchens, order in a tap, watch it come to you.
          </p>
          <div className="mt-7 max-w-lg">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search restaurants or cuisines…"
              className="input text-base"
            />
          </div>
        </div>
      </section>

      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-3xl font-bold">Order in</h2>
        <span className="text-sm text-[var(--muted)]">{list.length} place{list.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-44 bg-[var(--line)]" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-[var(--line)] rounded w-2/3" />
                <div className="h-4 bg-[var(--line)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">No restaurants match.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((r) => (
            <Link key={r._id} to={`/restaurant/${r._id}`} className="card group">
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--line)]">
                {r.image && <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition" />}
                <div className="absolute top-3 left-3 chip">★ {r.rating}</div>
                {!r.isOpen && <div className="absolute inset-0 bg-black/40 grid place-items-center text-white font-semibold">Closed</div>}
              </div>
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl font-bold truncate">{r.name}</h3>
                  <span className="text-sm text-[var(--muted)] whitespace-nowrap">{r.deliveryTimeMins} min</span>
                </div>
                <p className="text-sm text-[var(--muted)] mt-0.5">{r.cuisine}</p>
                <p className="text-xs text-[var(--muted)] mt-2">₹{r.priceForTwo} for two · {r.address}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
