// MongoDB Maintenance Model (Mongoose)
function createMaintenanceModel(mongoose) {
  if (!mongoose) return null;
  if (mongoose.models && mongoose.models.Maintenance) return mongoose.models.Maintenance;

  const maintenanceSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    vehicle_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    vehicle_name: { type: String, default: '' },
    vehicle_number: { type: String, default: '' },
    mechanic_id: { type: mongoose.Schema.Types.Mixed, default: null },
    mechanic_name: { type: String, default: 'Concierge Technician' },
    service_date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    service_type: { type: String, default: 'Routine Maintenance' },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    next_service_date: { type: String, default: null },
    status: {
      type: String,
      enum: ['In Progress', 'Completed', 'Scheduled'],
      default: 'In Progress'
    }
  }, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  });

  return mongoose.model('Maintenance', maintenanceSchema);
}

module.exports = createMaintenanceModel;
