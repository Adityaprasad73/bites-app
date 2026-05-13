import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icons broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers
function coloredIcon(color, emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:16px;line-height:1">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

const restaurantIcon = coloredIcon('#e11d48', '🍽️');
const customerIcon   = coloredIcon('#2563eb', '🏠');
const partnerIcon    = coloredIcon('#16a34a', '🛵');

// Auto-fit map to show all markers
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, JSON.stringify(positions)]);
  return null;
}

// Smoothly pan to partner location as it updates
function PanToPartner({ position }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!position) return;
    if (first.current) { map.setView(position, 14); first.current = false; }
    else map.panTo(position, { animate: true, duration: 1 });
  }, [position]);
  return null;
}

export default function DeliveryMap({ restaurant, customerAddress, partnerPos, status }) {
  // Default Delhi coords if we can't geocode
  const defaultCenter = [28.6139, 77.209];

  // Static coords for known demo addresses (avoids needing Geocoding API)
  function guessCoords(address) {
    if (!address) return null;
    const map = {
      'Khan Market':      [28.5997, 77.2270],
      'Greater Kailash':  [28.5389, 77.2430],
      'Hauz Khas':        [28.5535, 77.2003],
      'Cyber Hub':        [28.4950, 77.0886],
      'Connaught Place':  [28.6315, 77.2167],
      'Indiranagar':      [12.9716, 77.6412],
      'Bandra':           [19.0596, 72.8295],
    };
    for (const [key, coords] of Object.entries(map)) {
      if (address.includes(key)) return coords;
    }
    // Random slight offset from Delhi center as fallback
    return [28.6139 + (Math.random() - 0.5) * 0.05, 77.209 + (Math.random() - 0.5) * 0.05];
  }

  const restaurantPos = guessCoords(restaurant?.address);
  const dropPos       = guessCoords(customerAddress);
  const livePos       = partnerPos ? [partnerPos.lat, partnerPos.lng] : null;

  const allPositions = [restaurantPos, dropPos, livePos].filter(Boolean);
  const center = restaurantPos || defaultCenter;

  const isActive = status === 'out_for_delivery';

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--line)] shadow-sm" style={{ height: '320px' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds positions={allPositions} />
        {livePos && <PanToPartner position={livePos} />}

        {/* Route line */}
        {restaurantPos && dropPos && (
          <Polyline
            positions={[
              livePos || restaurantPos,
              dropPos,
            ]}
            color="#e11d48"
            weight={3}
            dashArray="8 6"
            opacity={0.7}
          />
        )}

        {/* Restaurant pin */}
        {restaurantPos && (
          <Marker position={restaurantPos} icon={restaurantIcon}>
            <Popup><strong>📍 {restaurant?.name}</strong><br />{restaurant?.address}</Popup>
          </Marker>
        )}

        {/* Customer / drop pin */}
        {dropPos && (
          <Marker position={dropPos} icon={customerIcon}>
            <Popup><strong>🏠 Delivery address</strong><br />{customerAddress}</Popup>
          </Marker>
        )}

        {/* Live delivery partner pin */}
        {livePos && isActive && (
          <Marker position={livePos} icon={partnerIcon}>
            <Popup>🛵 Delivery partner — on the way!</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
