// MongoDB Verification Model (Mongoose)
function createVerificationModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Verification) return mongoose.models.Verification;

  const verificationSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    target_type: {
      type: String,
      enum: ['customer_doc', 'vehicle_doc'],
      required: true
    },
    target_id: { type: mongoose.Schema.Types.Mixed, required: true },
    customer_name: { type: String, default: '' },
    vehicle_name: { type: String, default: '' },
    document_type: { type: String, required: true },
    verifier_name: { type: String, default: 'Operations & KYC Desk' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved'
    },
    comments: { type: String, default: '' },
    verified_at: { type: Date, default: Date.now }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  });

  return mongoose.model('Verification', verificationSchema);
}

module.exports = createVerificationModel;
