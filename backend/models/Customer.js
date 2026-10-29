// MongoDB Customer Model & Schema
function createCustomerModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Customer) return mongoose.models.Customer;

  const customerSchema = new mongoose.Schema({
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
      default: 'customer',
      index: true
    },
    license_number: {
      type: String,
      default: null,
      uppercase: true,
      trim: true
    },
    license_expiry: { type: String, default: '2028-12-31' },
    id_proof_type: {
      type: String,
      enum: ['Driving License', 'Aadhaar', 'Passport', 'Voter ID'],
      default: 'Driving License'
    },
    id_proof_number: { type: String, default: null },
    verification_status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified'
    },
    address: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    postal_code: { type: String, default: null, trim: true },
    avatar_url: { type: String, default: null },
    total_rentals: { type: Number, default: 0 },
    membership_tier: {
      type: String,
      enum: ['Standard', 'Silver', 'Gold', 'Platinum'],
      default: 'Standard'
    }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'customers'
  });

  // Keep full_name and name synchronized
  customerSchema.pre('validate', function(next) {
    if (this.full_name && !this.name) this.name = this.full_name;
    if (this.name && !this.full_name) this.full_name = this.name;
    next();
  });

  return mongoose.model('Customer', customerSchema);
}

module.exports = createCustomerModel;
