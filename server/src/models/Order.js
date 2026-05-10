import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 30 },
    total: { type: Number, required: true },
    address: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory = [{ status: this.status, at: new Date() }];
  } else if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status, at: new Date() });
  }
  next();
});

export default mongoose.model('Order', orderSchema);
