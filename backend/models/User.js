// MongoDB User Model (Mongoose)
function createUserModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.User) return mongoose.models.User;

  const userSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    full_name: {
      type: String,
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters']
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    phone: {
      type: String,
      trim: true,
      default: null
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'customer', 'manager', 'driver'],
        message: '{VALUE} is not a valid system role'
      },
      default: 'customer',
      index: true
    },
    role_id: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 2
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    avatar_url: {
      type: String,
      default: null
    },
    city: {
      type: String,
      default: null,
      trim: true
    },
    postal_code: {
      type: String,
      default: null,
      trim: true
    },
    address: {
      type: String,
      default: null,
      trim: true
    },
    // Reference to role-specific profile document in separate collection (Customer, Admin, Manager, Driver)
    role_profile_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    // Denormalized customer fields for fast display
    license_number: { type: String, default: null },
    verification_status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified'
    }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users'
  });

  // Keep full_name and name synchronized
  userSchema.pre('validate', function(next) {
    if (this.full_name && !this.name) this.name = this.full_name;
    if (this.name && !this.full_name) this.full_name = this.name;
    if (!this.full_name && !this.name) {
      this.full_name = 'Customer User';
      this.name = 'Customer User';
    }
    next();
  });

  return mongoose.model('User', userSchema);
}

module.exports = createUserModel;
