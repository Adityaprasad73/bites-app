import { Server } from 'socket.io';

let io = null;

export function initSockets(httpServer, origin) {
  io = new Server(httpServer, {
    cors: { origin, credentials: true },
  });

  io.on('connection', (socket) => {
    // Clients join rooms relevant to them
    socket.on('join:order', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('join:user', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on('join:restaurant', (restaurantId) => {
      if (restaurantId) socket.join(`restaurant:${restaurantId}`);
    });
    socket.on('join:delivery_pool', () => {
      socket.join('delivery_pool');
    });
  });

  console.log('[socket] initialized');
  return io;
}

// Emit an order update to everyone who cares about it.
export function emitOrderUpdate(order, meta = {}) {
  if (!io) return;
  const payload = { ...meta, order };
  io.to(`order:${order._id}`).emit('order:update', payload);
  io.to(`user:${order.customer}`).emit('order:update', payload);
  io.to(`restaurant:${order.restaurant}`).emit('order:update', payload);
  if (order.deliveryPartner) {
    io.to(`user:${order.deliveryPartner}`).emit('order:update', payload);
  }
  // newly-ready orders also fan out to the delivery pool
  if (order.status === 'ready_for_pickup' && !order.deliveryPartner) {
    io.to('delivery_pool').emit('order:update', payload);
  }
}
