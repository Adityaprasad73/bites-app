import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';

export default function Restaurant() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const { add, cart } = useCart();

  useEffect(() => {
    api.getRestaurant(id).then(setData).catch(() => setData(false));
  }, [id]);

  const grouped = useMemo(() => {
    if (!data?.menu) return {};
    return data.menu.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {});
  }, [data]);

  if (data === null) return <div className="p-10 text-center text-[var(--muted)]">Loading…</div>;
  if (data === false) return <div className="p-10 text-center text-[var(--muted)]">Restaurant not found.</div>;

  const { restaurant, menu } = data;
  const inCart = (itemId) => cart.items.find((i) => i._id === itemId)?.quantity || 0;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="card overflow-hidden mb-8">
        <div className="aspect-[3/1] relative bg-[var(--line)]">
          {restaurant.image && <img src={restaurant.image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="p-6">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-4xl font-black tracking-tight">{restaurant.name}</h1>
              <p className="text-[var(--muted)] mt-1">{restaurant.cuisine} · {restaurant.address}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip">★ {restaurant.rating}</span>
              <span className="chip">{restaurant.deliveryTimeMins} min</span>
              <span className="chip">₹{restaurant.priceForTwo} for two</span>
            </div>
          </div>
          {restaurant.description && <p className="mt-4 text-sm">{restaurant.description}</p>}
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} className="mb-8">
          <h2 className="font-display text-2xl font-bold mb-3">{cat}</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="card flex items-stretch overflow-hidden">
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 border rounded-sm grid place-items-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </span>
                    <h3 className="font-semibold">{item.name}</h3>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1">{item.description}</p>
                  <p className="font-display text-lg font-bold mt-2">₹{item.price}</p>
                </div>
                <div className="w-32 md:w-44 relative shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--line)] to-white" />
                  )}
                  <button
                    onClick={() => add(restaurant, item)}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 btn btn-primary text-xs px-4 py-1.5 shadow-lg"
                  >
                    {inCart(item._id) ? `In cart · ${inCart(item._id)}` : 'Add'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {menu.length === 0 && <p className="text-[var(--muted)]">No menu items yet.</p>}
    </div>
  );
}
