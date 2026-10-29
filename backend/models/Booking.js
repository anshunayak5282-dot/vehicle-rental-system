// MongoDB Booking Model (Mongoose)
function createBookingModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Booking) return mongoose.models.Booking;

  const bookingSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    booking_code: { type: String, unique: true, index: true },
    customer_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    customer_name: { type: String, default: 'Customer' },
    customer_email: { type: String, default: '' },
    customer_phone: { type: String, default: '' },
    vehicle_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    vehicle_name: { type: String, default: '' },
    vehicle_number: { type: String, default: '' },
    vehicle_image: { type: String, default: '' },
    driver_id: { type: mongoose.Schema.Types.Mixed, default: null },
    driver_name: { type: String, default: 'Self-Drive' },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    total_days: { type: Number, required: true, default: 1 },
    daily_rate: { type: Number, required: true, default: 0 },
    total_amount: { type: Number, required: true, default: 0 },
    driver_required: { type: Boolean, default: false },
    insurance_opted: { type: Boolean, default: true },
    pickup_location: { type: String, default: 'Mumbai - BKC Hub' },
    drop_location: { type: String, default: 'Mumbai - BKC Hub' },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Active', 'Approved', 'Completed', 'Cancelled', 'Rejected'],
      default: 'Pending',
      index: true
    },
    payment_status: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Refunded'],
      default: 'Unpaid'
    },
    notes: { type: String, default: '' }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  });

  return mongoose.model('Booking', bookingSchema);
}

module.exports = createBookingModel;
