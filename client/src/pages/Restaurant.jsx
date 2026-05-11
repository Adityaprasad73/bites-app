import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';

export default function Restaurant() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const { add, cart } = useCart();
  const sectionRefs = useRef({});

  useEffect(() => {
    api.getRestaurant(id).then(setData).catch(() => setData(false));
  }, [id]);

  const categories = useMemo(() => {
    if (!data?.menu) return [];
    const order = ['Starter', 'Main Course', 'Breads', 'Rice', 'Dessert', 'Beverages', 'Sides'];
    const cats = [...new Set(data.menu.map(i => i.category))];
    return cats.sort((a, b) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  }, [data]);

  const grouped = useMemo(() => {
    if (!data?.menu) return {};
    const items = vegOnly ? data.menu.filter(i => i.isVeg) : data.menu;
    return items.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {});
  }, [data, vegOnly]);

  // Set first category as active on load
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]);
  }, [categories]);

  function scrollToCategory(cat) {
    setActiveCategory(cat);
    const el = sectionRefs.current[cat];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveCategory(entry.target.dataset.category);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [grouped]);

  if (data === null) return <div className="p-10 text-center text-[var(--muted)]">Loading…</div>;
  if (data === false) return <div className="p-10 text-center text-[var(--muted)]">Restaurant not found.</div>;

  const { restaurant, menu } = data;
  const inCart = (itemId) => cart.items.find((i) => i._id === itemId)?.quantity || 0;
  const visibleCategories = categories.filter(c => grouped[c]?.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Hero card */}
      <div className="card overflow-hidden mb-6">
        <div className="aspect-[3/1] relative bg-[var(--line)]">
          {restaurant.image
            ? <img src={restaurant.image} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full grid place-items-center text-6xl opacity-30">🍽️</div>
          }
          {restaurant.isOpen === false && (
            <div className="absolute inset-0 bg-black/50 grid place-items-center">
              <span className="bg-white/90 px-4 py-2 rounded-full font-semibold">Currently Closed</span>
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-4xl font-black tracking-tight">{restaurant.name}</h1>
              <p className="text-[var(--muted)] mt-1">{restaurant.cuisine} · {restaurant.address}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">★ {restaurant.rating}</span>
              <span className="chip">🕒 {restaurant.deliveryTimeMins} min</span>
              <span className="chip">₹{restaurant.priceForTwo} for two</span>
            </div>
          </div>
          {restaurant.description && <p className="mt-4 text-sm text-[var(--muted)]">{restaurant.description}</p>}
        </div>
      </div>

      {menu.length === 0 ? (
        <p className="text-[var(--muted)] text-center py-16">No menu items yet.</p>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Sticky category sidebar — desktop */}
          <aside className="hidden md:block w-44 shrink-0 sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">Menu</p>
            <nav className="space-y-1">
              {visibleCategories.map(cat => (
                <button key={cat} onClick={() => scrollToCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition font-medium ${
                    activeCategory === cat ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)] text-[var(--ink)]'
                  }`}>
                  {cat}
                  <span className="ml-1 text-xs opacity-60">({grouped[cat]?.length || 0})</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile: horizontal category scroll + veg toggle */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
                {visibleCategories.map(cat => (
                  <button key={cat} onClick={() => scrollToCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      activeCategory === cat ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white border-[var(--line)]'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
              {/* Veg toggle */}
              <button
                onClick={() => setVegOnly(v => !v)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  vegOnly ? 'bg-green-600 text-white border-green-600' : 'bg-white border-[var(--line)] text-[var(--ink)]'
                }`}
              >
                <span className="w-3 h-3 border-2 rounded-sm grid place-items-center border-current shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${vegOnly ? 'bg-white' : 'bg-green-600'}`} />
                </span>
                Veg only
              </button>
            </div>

            {visibleCategories.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🥗</p>
                <p className="font-display text-xl font-bold">No veg items found</p>
                <button onClick={() => setVegOnly(false)} className="btn btn-ghost mt-4 text-sm">Show all items</button>
              </div>
            )}

            {visibleCategories.map((cat) => (
              <section
                key={cat}
                className="mb-8 scroll-mt-24"
                data-category={cat}
                ref={el => sectionRefs.current[cat] = el}
              >
                <h2 className="font-display text-2xl font-bold mb-3">{cat}</h2>
                <div className="space-y-3">
                  {grouped[cat].map((item) => (
                    <div key={item._id} className="card flex items-stretch overflow-hidden">
                      <div className="flex-1 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3.5 h-3.5 border-2 rounded-sm grid place-items-center shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                          </span>
                          <h3 className="font-semibold">{item.name}</h3>
                        </div>
                        {item.description && <p className="text-sm text-[var(--muted)]">{item.description}</p>}
                        <p className="font-display text-lg font-bold mt-2">₹{item.price}</p>
                      </div>
                      <div className="w-32 md:w-44 relative shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[var(--line)] to-white flex items-center justify-center text-3xl opacity-50">🍽️</div>
                        )}
                        <button
                          onClick={() => add(restaurant, item)}
                          className={`absolute bottom-2 left-1/2 -translate-x-1/2 btn text-xs px-4 py-1.5 shadow-lg transition ${
                            inCart(item._id) ? 'bg-green-600 text-white hover:bg-green-700' : 'btn-primary'
                          }`}
                        >
                          {inCart(item._id) ? `✓ ${inCart(item._id)} in cart` : '+ Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
