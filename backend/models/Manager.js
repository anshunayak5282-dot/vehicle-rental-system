// MongoDB Manager Model & Schema
function createManagerModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Manager) return mongoose.models.Manager;

  const managerSchema = new mongoose.Schema({
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
      default: 'manager',
      index: true
    },
    hub_assigned: { type: String, default: 'Mumbai - BKC Hub' },
    managed_hubs: {
      type: [String],
      default: ['Mumbai - BKC Hub', 'Mumbai - Worli Hub', 'Goa - Coastal Suite']
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Night', 'Rotational'],
      default: 'Morning'
    },
    active_dispatches: { type: Number, default: 0 }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'managers'
  });

  // Keep full_name and name synchronized
  managerSchema.pre('validate', function(next) {
    if (this.full_name && !this.name) this.name = this.full_name;
    if (this.name && !this.full_name) this.full_name = this.name;
    next();
  });

  return mongoose.model('Manager', managerSchema);
}

module.exports = createManagerModel;
