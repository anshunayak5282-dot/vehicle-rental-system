// MongoDB Admin Model & Schema
function createAdminModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Admin) return mongoose.models.Admin;

  const adminSchema = new mongoose.Schema({
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
      default: 'admin',
      index: true
    },
    admin_level: {
      type: String,
      enum: ['Super Admin', 'Fleet Admin', 'Operations Admin'],
      default: 'Super Admin'
    },
    department: { type: String, default: 'Executive Management' },
    permissions: {
      type: [String],
      default: ['manage_fleet', 'manage_users', 'view_reports', 'manage_finances', 'system_governance']
    },
    last_audit_at: { type: Date, default: Date.now }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'admins'
  });

  // Keep full_name and name synchronized
  adminSchema.pre('validate', function(next) {
    if (this.full_name && !this.name) this.name = this.full_name;
    if (this.name && !this.full_name) this.full_name = this.name;
    next();
  });

  return mongoose.model('Admin', adminSchema);
}

module.exports = createAdminModel;
