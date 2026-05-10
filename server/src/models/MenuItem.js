import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    category: { type: String, trim: true, default: 'Main' },
    isVeg: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('MenuItem', menuItemSchema);
