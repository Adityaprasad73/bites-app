import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    cuisine: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String },
    rating: { type: Number, default: 4.2, min: 0, max: 5 },
    deliveryTimeMins: { type: Number, default: 30 },
    priceForTwo: { type: Number, default: 500 },
    address: { type: String, trim: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Restaurant', restaurantSchema);
