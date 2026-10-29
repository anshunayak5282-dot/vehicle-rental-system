// MongoDB Payment Model (Mongoose)
function createPaymentModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Payment) return mongoose.models.Payment;

  const paymentSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    booking_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    customer_id: { type: mongoose.Schema.Types.Mixed, required: true },
    customer_name: { type: String, default: '' },
    amount: { type: Number, required: true },
    payment_method: { type: String, default: 'UPI / Online' },
    transaction_id: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Paid'
    },
    paid_at: { type: Date, default: Date.now }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  });

  return mongoose.model('Payment', paymentSchema);
}

module.exports = createPaymentModel;
