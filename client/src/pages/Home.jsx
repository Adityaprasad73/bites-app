import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const CUISINES = ['All', 'Indian', 'Chinese', 'Italian', 'Mexican', 'Fast Food', 'Healthy', 'Desserts'];

export default function Home() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [cuisine, setCuisine] = useState('All');
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

  const filtered = cuisine === 'All' ? list : list.filter(r =>
    r.cuisine?.toLowerCase().includes(cuisine.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      {/* Hero */}
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
          <div className="mt-7 max-w-lg relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search restaurants or cuisines…"
              className="input text-base"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
        </div>
        <div className="absolute right-8 top-8 text-5xl opacity-60 hidden md:block rotate-12">🍕</div>
        <div className="absolute right-28 bottom-8 text-4xl opacity-50 hidden md:block -rotate-6">🍜</div>
        <div className="absolute right-16 top-1/2 text-3xl opacity-40 hidden md:block rotate-6">🌮</div>
      </section>

      {/* Cuisine filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6" style={{scrollbarWidth:'none'}}>
        {CUISINES.map(c => (
          <button
            key={c}
            onClick={() => setCuisine(c)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${
              cuisine === c
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-white border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]'
            }`}
          >{c}</button>
        ))}
      </div>

      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-3xl font-bold">
          {cuisine !== 'All' ? cuisine : 'Order in'}
        </h2>
        <span className="text-sm text-[var(--muted)]">{filtered.length} place{filtered.length !== 1 ? 's' : ''}</span>
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="font-display text-2xl font-bold">No restaurants found</p>
          <p className="text-[var(--muted)] mt-2">Try a different search or cuisine</p>
          <button onClick={() => { setQ(''); setCuisine('All'); }} className="btn btn-ghost mt-4">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <Link key={r._id} to={`/restaurant/${r._id}`} className="card group">
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[var(--line)] to-orange-50">
                {r.image
                  ? <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                }
                <div className="absolute top-3 left-3 chip bg-white/90 backdrop-blur-sm">⭐ {r.rating || '4.0'}</div>
                {r.deliveryTimeMins && (
                  <div className="absolute top-3 right-3 chip bg-white/90 backdrop-blur-sm">{r.deliveryTimeMins} min</div>
                )}
                {r.isOpen === false && (
                  <div className="absolute inset-0 bg-black/50 grid place-items-center">
                    <span className="bg-white/90 px-3 py-1 rounded-full text-sm font-semibold">Closed</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display text-xl font-bold truncate">{r.name}</h3>
                <p className="text-sm text-[var(--muted)] mt-0.5">{r.cuisine || 'Multi-cuisine'}</p>
                <div className="flex items-center gap-3 mt-2">
                  {r.priceForTwo && <span className="text-xs text-[var(--muted)]">₹{r.priceForTwo} for two</span>}
                  {r.address && <span className="text-xs text-[var(--muted)] truncate">📍 {r.address}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
