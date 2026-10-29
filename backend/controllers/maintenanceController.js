const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/maintenance
async function getMaintenance(req, res, next) {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Maintenance) {
      const docs = await models.Maintenance.find({}).sort({ id: -1, _id: -1 }).lean();
      const maintenance = docs.map(m => ({ ...m, id: m.id || m._id.toString() }));
      return res.json({ success: true, count: maintenance.length, maintenance });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query(`
        SELECT m.*, v.brand, v.model, v.vehicle_number, u.name AS mechanic_name
        FROM maintenance m
        JOIN vehicles v ON m.vehicle_id = v.id
        JOIN users u ON m.mechanic_id = u.id
        ORDER BY m.id DESC
      `);
      return res.json({ success: true, count: rows.length, maintenance: rows });
    }

    // 3. Fallback
    return res.json({ success: true, count: mockStore.maintenanceRecords.length, maintenance: mockStore.maintenanceRecords });
  } catch (err) {
    next(err);
  }
}

// POST /api/maintenance
async function createMaintenance(req, res, next) {
  try {
    const { vehicle_id, service_date, service_type, description, cost, next_service_date, mark_under_maintenance = true } = req.body;
    const mechanic_id = req.user ? req.user.id : 4;

    if (!vehicle_id || !description || !cost) {
      return res.status(400).json({ success: false, message: 'Vehicle, description and cost are required' });
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Maintenance) {
      let v = null;
      if (models.Vehicle) {
        if (String(vehicle_id).match(/^[0-9a-fA-F]{24}$/)) {
          v = await models.Vehicle.findById(vehicle_id).lean();
        }
        if (!v && !isNaN(vehicle_id)) {
          v = await models.Vehicle.findOne({ id: parseInt(vehicle_id) }).lean();
        }
      }

      const count = await models.Maintenance.countDocuments();
      const newId = count + 1;

      const newM = new models.Maintenance({
        id: newId,
        vehicle_id,
        vehicle_name: v ? `${v.brand} ${v.model}` : 'Vehicle',
        vehicle_number: v ? v.vehicle_number : 'MH 01 RQ 0118',
        mechanic_id,
        mechanic_name: req.user ? req.user.name : 'Concierge Technician',
        service_date: service_date || new Date().toISOString().split('T')[0],
        service_type: service_type || 'Routine Maintenance',
        description,
        cost: parseFloat(cost),
        next_service_date: next_service_date || null,
        status: 'In Progress'
      });

      await newM.save();

      if (mark_under_maintenance && models.Vehicle) {
        if (String(vehicle_id).match(/^[0-9a-fA-F]{24}$/)) {
          await models.Vehicle.findByIdAndUpdate(vehicle_id, { status: 'Under Maintenance' });
        } else if (!isNaN(vehicle_id)) {
          await models.Vehicle.findOneAndUpdate({ id: parseInt(vehicle_id) }, { status: 'Under Maintenance' });
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Maintenance record created in MongoDB',
        recordId: newId,
        record: { ...newM.toObject(), id: newId }
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const result = await query(
        `INSERT INTO maintenance (vehicle_id, mechanic_id, service_date, service_type, description, cost, next_service_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'In Progress')`,
        [vehicle_id, mechanic_id, service_date || new Date().toISOString().split('T')[0], service_type || 'Routine Maintenance', description, cost, next_service_date || null]
      );

      if (mark_under_maintenance) {
        await query('UPDATE vehicles SET status = "Under Maintenance" WHERE id = ?', [vehicle_id]);
      }

      return res.status(201).json({ success: true, message: 'Maintenance record created', recordId: result.insertId });
    }

    // 3. Fallback
    const v = mockStore.vehicles.find(item => item.id === parseInt(vehicle_id));
    if (mark_under_maintenance && v) {
      v.status = 'Under Maintenance';
    }

    const newRec = {
      id: mockStore.maintenanceRecords.length + 1,
      vehicle_id: parseInt(vehicle_id),
      vehicle_name: v ? `${v.brand} ${v.model}` : 'Vehicle',
      vehicle_number: v ? v.vehicle_number : 'REG-000',
      mechanic_id,
      mechanic_name: req.user ? req.user.name : 'Viktor Ramos',
      service_date: service_date || new Date().toISOString().split('T')[0],
      service_type: service_type || 'Diagnostic & Service',
      description,
      cost: parseFloat(cost),
      next_service_date: next_service_date || null,
      status: 'In Progress'
    };

    mockStore.maintenanceRecords.unshift(newRec);
    return res.status(201).json({ success: true, message: 'Maintenance record logged successfully', record: newRec });
  } catch (err) {
    next(err);
  }
}

// PUT /api/maintenance/:id
async function updateMaintenance(req, res, next) {
  try {
    const { id } = req.params;
    const { status, cost, description, next_service_date, mark_available } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Maintenance) {
      const updates = {};
      if (status) updates.status = status;
      if (cost) updates.cost = parseFloat(cost);
      if (description) updates.description = description;
      if (next_service_date) updates.next_service_date = next_service_date;

      let rec = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        rec = await models.Maintenance.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!rec && !isNaN(id)) {
        rec = await models.Maintenance.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }

      if (mark_available && rec && models.Vehicle) {
        if (String(rec.vehicle_id).match(/^[0-9a-fA-F]{24}$/)) {
          await models.Vehicle.findByIdAndUpdate(rec.vehicle_id, { status: 'Available' });
        } else if (!isNaN(rec.vehicle_id)) {
          await models.Vehicle.findOneAndUpdate({ id: parseInt(rec.vehicle_id) }, { status: 'Available' });
        }
      }

      return res.json({ success: true, message: 'Maintenance record updated in MongoDB', record: rec });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const updates = [];
      const params = [];
      if (status) { updates.push('status = ?'); params.push(status); }
      if (cost) { updates.push('cost = ?'); params.push(parseFloat(cost)); }
      if (description) { updates.push('description = ?'); params.push(description); }
      if (next_service_date) { updates.push('next_service_date = ?'); params.push(next_service_date); }

      params.push(id);
      await query(`UPDATE maintenance SET ${updates.join(', ')} WHERE id = ?`, params);

      if (mark_available) {
        const rows = await query('SELECT vehicle_id FROM maintenance WHERE id = ?', [id]);
        if (rows.length > 0) {
          await query('UPDATE vehicles SET status = "Available" WHERE id = ?', [rows[0].vehicle_id]);
        }
      }

      return res.json({ success: true, message: 'Maintenance record updated' });
    }

    // 3. Fallback
    const rec = mockStore.maintenanceRecords.find(item => item.id === parseInt(id));
    if (!rec) return res.status(404).json({ success: false, message: 'Maintenance record not found' });

    if (status) rec.status = status;
    if (cost) rec.cost = parseFloat(cost);
    if (description) rec.description = description;
    if (next_service_date) rec.next_service_date = next_service_date;

    if (mark_available || status === 'Completed') {
      const v = mockStore.vehicles.find(item => item.id === rec.vehicle_id);
      if (v) v.status = 'Available';
    }

    return res.json({ success: true, message: 'Maintenance record updated successfully', record: rec });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMaintenance,
  createMaintenance,
  updateMaintenance
};
