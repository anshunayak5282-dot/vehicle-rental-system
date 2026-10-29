// MongoDB Driver Model & Schema
function createDriverModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Driver) return mongoose.models.Driver;

  const driverSchema = new mongoose.Schema({
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    user_num_id: { type: Number, index: true },
    full_name: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      default: 'driver',
      index: true
    },
    license_number: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    experience_years: { type: Number, default: 5 },
    availability_status: {
      type: String,
      enum: ['available', 'on_trip', 'off_duty'],
      default: 'available',
      index: true
    },
    rating: { type: Number, default: 5.0 },
    total_trips: { type: Number, default: 0 },
    badge_level: { type: String, default: 'Executive Chauffeur' }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'drivers'
  });

  // Keep full_name and name synchronized
  driverSchema.pre('validate', function(next) {
    if (this.full_name && !this.name) this.name = this.full_name;
    if (this.name && !this.full_name) this.full_name = this.name;
    next();
  });

  return mongoose.model('Driver', driverSchema);
}

module.exports = createDriverModel;
