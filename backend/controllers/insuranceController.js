const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/insurance
async function getInsurance(req, res, next) {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Insurance) {
      const docs = await models.Insurance.find({}).sort({ id: -1, _id: -1 }).lean();
      const insurance = docs.map(i => ({ ...i, id: i.id || i._id.toString() }));
      return res.json({ success: true, count: insurance.length, insurance });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query(`
        SELECT i.*, v.brand, v.model, v.vehicle_number
        FROM insurance i
        JOIN vehicles v ON i.vehicle_id = v.id
        ORDER BY i.id DESC
      `);
      return res.json({ success: true, count: rows.length, insurance: rows });
    }

    // 3. Fallback
    return res.json({ success: true, count: mockStore.insuranceRecords.length, insurance: mockStore.insuranceRecords });
  } catch (err) {
    next(err);
  }
}

// POST /api/insurance
async function createInsurance(req, res, next) {
  try {
    const { vehicle_id, policy_number, provider_name, coverage_type, start_date, expiry_date, premium_amount } = req.body;

    if (!vehicle_id || !policy_number || !provider_name || !expiry_date) {
      return res.status(400).json({ success: false, message: 'Vehicle, policy number, provider and expiry are required.' });
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Insurance) {
      let v = null;
      if (models.Vehicle) {
        if (String(vehicle_id).match(/^[0-9a-fA-F]{24}$/)) {
          v = await models.Vehicle.findById(vehicle_id).lean();
        }
        if (!v && !isNaN(vehicle_id)) {
          v = await models.Vehicle.findOne({ id: parseInt(vehicle_id) }).lean();
        }
      }

      const count = await models.Insurance.countDocuments();
      const newId = count + 1;

      const newPol = new models.Insurance({
        id: newId,
        vehicle_id,
        vehicle_name: v ? `${v.brand} ${v.model}` : 'Vehicle',
        vehicle_number: v ? v.vehicle_number : 'POL-VEH',
        policy_number,
        provider_name,
        coverage_type: coverage_type || 'Comprehensive Zero-Dep',
        start_date: start_date || new Date().toISOString().split('T')[0],
        expiry_date,
        premium_amount: parseFloat(premium_amount) || 12000,
        status: 'Active'
      });

      await newPol.save();
      return res.status(201).json({
        success: true,
        message: 'Policy added successfully in MongoDB',
        insuranceId: newId,
        insurance: { ...newPol.toObject(), id: newId }
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const result = await query(
        `INSERT INTO insurance (vehicle_id, policy_number, provider_name, coverage_type, start_date, expiry_date, premium_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [vehicle_id, policy_number, provider_name, coverage_type || 'Comprehensive Zero-Dep', start_date || new Date().toISOString().split('T')[0], expiry_date, premium_amount || 12000]
      );
      return res.status(201).json({ success: true, message: 'Policy added successfully', insuranceId: result.insertId });
    }

    // 3. Fallback
    const v = mockStore.vehicles.find(item => item.id === parseInt(vehicle_id));
    const newPol = {
      id: mockStore.insuranceRecords.length + 1,
      vehicle_id: parseInt(vehicle_id),
      vehicle_name: v ? `${v.brand} ${v.model}` : 'Vehicle',
      vehicle_number: v ? v.vehicle_number : 'POL-VEH',
      policy_number,
      provider_name,
      coverage_type: coverage_type || 'Comprehensive Zero-Dep',
      start_date: start_date || new Date().toISOString().split('T')[0],
      expiry_date,
      premium_amount: parseFloat(premium_amount) || 12000,
      status: 'Active'
    };
    mockStore.insuranceRecords.unshift(newPol);
    return res.status(201).json({ success: true, message: 'Policy added successfully', insurance: newPol });
  } catch (err) {
    next(err);
  }
}

// PUT /api/insurance/:id
async function updateInsurance(req, res, next) {
  try {
    const { id } = req.params;
    const { provider_name, coverage_type, expiry_date, status, premium_amount } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Insurance) {
      const updates = {};
      if (provider_name) updates.provider_name = provider_name;
      if (coverage_type) updates.coverage_type = coverage_type;
      if (expiry_date) updates.expiry_date = expiry_date;
      if (status) updates.status = status;
      if (premium_amount) updates.premium_amount = parseFloat(premium_amount);

      let rec = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        rec = await models.Insurance.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!rec && !isNaN(id)) {
        rec = await models.Insurance.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      return res.json({ success: true, message: 'Insurance policy updated in MongoDB', insurance: rec });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const updates = [];
      const params = [];

      if (provider_name) { updates.push('provider_name = ?'); params.push(provider_name); }
      if (coverage_type) { updates.push('coverage_type = ?'); params.push(coverage_type); }
      if (expiry_date) { updates.push('expiry_date = ?'); params.push(expiry_date); }
      if (status) { updates.push('status = ?'); params.push(status); }
      if (premium_amount) { updates.push('premium_amount = ?'); params.push(parseFloat(premium_amount)); }

      params.push(id);
      await query(`UPDATE insurance SET ${updates.join(', ')} WHERE id = ?`, params);
      return res.json({ success: true, message: 'Insurance policy updated' });
    }

    // 3. Fallback
    const rec = mockStore.insuranceRecords.find(item => item.id === parseInt(id));
    if (!rec) return res.status(404).json({ success: false, message: 'Insurance record not found' });
    if (provider_name) rec.provider_name = provider_name;
    if (coverage_type) rec.coverage_type = coverage_type;
    if (expiry_date) rec.expiry_date = expiry_date;
    if (status) rec.status = status;
    if (premium_amount) rec.premium_amount = parseFloat(premium_amount);
    return res.json({ success: true, message: 'Insurance policy updated', insurance: rec });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInsurance,
  createInsurance,
  updateInsurance
};
