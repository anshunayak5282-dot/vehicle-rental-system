// MongoDB Vehicle Model (Mongoose)
function createVehicleModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Vehicle) return mongoose.models.Vehicle;

  const vehicleSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    vehicle_number: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    vehicle_type: {
      type: String,
      required: true,
      default: 'SUV'
    },
    fuel_type: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
      default: 'Petrol'
    },
    transmission: {
      type: String,
      enum: ['Automatic', 'Manual'],
      default: 'Automatic'
    },
    seating_capacity: { type: Number, default: 5 },
    rental_price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Available', 'Booked', 'Rented', 'Under Maintenance', 'Unavailable'],
      default: 'Available',
      index: true
    },
    image_url: {
      type: String,
      default: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'
    },
    location: {
      type: String,
      default: 'Mumbai - BKC Hub'
    },
    mileage: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 5.0 },
    owner_id: { type: mongoose.Schema.Types.Mixed, default: null }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  });

  return mongoose.model('Vehicle', vehicleSchema);
}

module.exports = createVehicleModel;
