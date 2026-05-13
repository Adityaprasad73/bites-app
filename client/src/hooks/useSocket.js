import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket = null;
function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || '/', { autoConnect: true });
  }
  return socket;
}

export function useSocket(joins = [], onUpdate) {
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;

  useEffect(() => {
    const s = getSocket();
    function handler(payload) { handlerRef.current && handlerRef.current(payload); }
    s.on('order:update', handler);
    joins.forEach(({ event, value }) => s.emit(event, value));
    return () => { s.off('order:update', handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(joins)]);
}

// Hook for delivery partner to broadcast their GPS location
export function usePartnerLocation(orderId, active) {
  useEffect(() => {
    if (!active || !orderId) return;
    const s = getSocket();

    const watcher = navigator.geolocation?.watchPosition(
      (pos) => {
        s.emit('partner:location', {
          orderId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watcher !== undefined) navigator.geolocation?.clearWatch(watcher);
    };
  }, [orderId, active]);
}

// Hook for customer to receive partner location updates
export function usePartnerLocationReceiver(orderId, onLocation) {
  const handlerRef = useRef(onLocation);
  handlerRef.current = onLocation;

  useEffect(() => {
    if (!orderId) return;
    const s = getSocket();
    s.emit('join:order', orderId);
    function handler(pos) { handlerRef.current && handlerRef.current(pos); }
    s.on('partner:location', handler);
    return () => s.off('partner:location', handler);
  }, [orderId]);
}
