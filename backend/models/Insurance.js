// MongoDB Insurance Model (Mongoose)
function createInsuranceModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Insurance) return mongoose.models.Insurance;

  const insuranceSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    vehicle_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    vehicle_name: { type: String, default: '' },
    vehicle_number: { type: String, default: '' },
    policy_number: { type: String, required: true, unique: true, index: true },
    provider_name: { type: String, default: 'HDFC ERGO General Insurance' },
    coverage_type: { type: String, default: 'Comprehensive Zero-Depreciation' },
    start_date: { type: String, required: true },
    expiry_date: { type: String, required: true },
    premium_amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Claimed'],
      default: 'Active'
    }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  });

  return mongoose.model('Insurance', insuranceSchema);
}

module.exports = createInsuranceModel;
