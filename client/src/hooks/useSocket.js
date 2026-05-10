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
