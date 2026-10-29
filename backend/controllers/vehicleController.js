const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/vehicles
async function getVehicles(req, res, next) {
  try {
    const { type, brand, status, search, minPrice, maxPrice } = req.query;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB Database
    if (isMongoConnected() && models.Vehicle) {
      const queryObj = {};

      if (type && type.toLowerCase() !== 'all') {
        queryObj.vehicle_type = new RegExp(`^${type.trim()}$`, 'i');
      }
      if (brand && brand.toLowerCase() !== 'all') {
        queryObj.brand = new RegExp(`^${brand.trim()}$`, 'i');
      }
      if (status && status.toLowerCase() !== 'all') {
        queryObj.status = new RegExp(`^${status.trim()}$`, 'i');
      }
      if (minPrice || maxPrice) {
        queryObj.rental_price = {};
        if (minPrice) queryObj.rental_price.$gte = parseFloat(minPrice);
        if (maxPrice) queryObj.rental_price.$lte = parseFloat(maxPrice);
      }
      if (search && search.trim()) {
        const term = new RegExp(search.trim(), 'i');
        queryObj.$or = [
          { brand: term },
          { model: term },
          { vehicle_number: term },
          { location: term }
        ];
      }

      const docs = await models.Vehicle.find(queryObj).sort({ id: -1, _id: -1 }).lean();
      const vehicles = docs.map(d => ({ ...d, id: d.id || d._id.toString() }));
      return res.json({ success: true, count: vehicles.length, vehicles });
    }

    // 2. MySQL Database
    if (isDbConnected()) {
      let sql = 'SELECT * FROM vehicles WHERE 1=1';
      const params = [];

      if (type && type.toLowerCase() !== 'all') {
        sql += ' AND LOWER(vehicle_type) = LOWER(?)';
        params.push(type);
      }
      if (brand && brand.toLowerCase() !== 'all') {
        sql += ' AND LOWER(brand) = LOWER(?)';
        params.push(brand);
      }
      if (status && status.toLowerCase() !== 'all') {
        sql += ' AND LOWER(status) = LOWER(?)';
        params.push(status);
      }
      if (minPrice) {
        sql += ' AND rental_price >= ?';
        params.push(parseFloat(minPrice));
      }
      if (maxPrice) {
        sql += ' AND rental_price <= ?';
        params.push(parseFloat(maxPrice));
      }
      if (search && search.trim()) {
        sql += ' AND (brand LIKE ? OR model LIKE ? OR vehicle_number LIKE ? OR location LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term, term);
      }

      sql += ' ORDER BY id DESC';
      const rows = await query(sql, params);
      return res.json({ success: true, count: rows.length, vehicles: rows });
    }

    // 3. In-memory Mock Store Fallback
    let list = [...mockStore.vehicles];

    if (type && type.toLowerCase() !== 'all') {
      list = list.filter(v => v.vehicle_type.toLowerCase() === type.toLowerCase());
    }
    if (brand && brand.toLowerCase() !== 'all') {
      list = list.filter(v => v.brand.toLowerCase() === brand.toLowerCase());
    }
    if (status && status.toLowerCase() !== 'all') {
      list = list.filter(v => v.status.toLowerCase() === status.toLowerCase());
    }
    if (minPrice) {
      list = list.filter(v => v.rental_price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      list = list.filter(v => v.rental_price <= parseFloat(maxPrice));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(v =>
        (v.brand && v.brand.toLowerCase().includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q)) ||
        (v.vehicle_number && v.vehicle_number.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, count: list.length, vehicles: list });
  } catch (err) {
    next(err);
  }
}

// GET /api/vehicles/available
async function getAvailableVehicles(req, res, next) {
  req.query.status = 'Available';
  return getVehicles(req, res, next);
}

// GET /api/vehicles/:id
async function getVehicleById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Vehicle) {
      let vehicle = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        vehicle = await models.Vehicle.findById(id).lean();
      }
      if (!vehicle && !isNaN(id)) {
        vehicle = await models.Vehicle.findOne({ id: parseInt(id) }).lean();
      }
      if (!vehicle) {
        vehicle = await models.Vehicle.findOne({ vehicle_number: String(id).toUpperCase() }).lean();
      }
      if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      return res.json({ success: true, vehicle: { ...vehicle, id: vehicle.id || vehicle._id.toString() } });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query('SELECT * FROM vehicles WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      return res.json({ success: true, vehicle: rows[0] });
    }

    // 3. Fallback
    const vehicle = mockStore.vehicles.find(v => v.id === parseInt(id));
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    return res.json({ success: true, vehicle });
  } catch (err) {
    next(err);
  }
}

// POST /api/vehicles
async function createVehicle(req, res, next) {
  try {
    const {
      vehicle_number,
      brand,
      model,
      vehicle_type,
      fuel_type = 'Petrol',
      transmission = 'Automatic',
      seating_capacity = 5,
      rental_price,
      image_url,
      location = 'Mumbai - BKC Hub',
      mileage = 0
    } = req.body;

    if (!vehicle_number || !brand || !model || !rental_price) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle registration plate number, brand, model, and daily price are required.'
      });
    }

    const cleanVehicleNumber = String(vehicle_number).trim().toUpperCase();
    const cleanBrand = String(brand).trim();
    const cleanModel = String(model).trim();
    const cleanType = String(vehicle_type || 'SUV').trim();
    const cleanFuel = String(fuel_type || 'Petrol').trim();
    const cleanTransmission = String(transmission || 'Automatic').trim();
    const cleanSeats = Math.max(1, parseInt(seating_capacity) || 5);
    const cleanPrice = Math.max(0, parseFloat(rental_price) || 0);
    const cleanImage = (image_url && String(image_url).trim()) || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
    const cleanLocation = (location && String(location).trim()) || 'Mumbai - BKC Hub';
    const cleanMileage = Math.max(0, parseInt(mileage) || 0);

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB Database
    if (isMongoConnected() && models.Vehicle) {
      const existing = await models.Vehicle.findOne({ vehicle_number: cleanVehicleNumber });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `A vehicle with plate number "${cleanVehicleNumber}" already exists in MongoDB fleet.`
        });
      }

      const totalDocs = await models.Vehicle.countDocuments();
      const newId = totalDocs + 1;

      const newVehicleDoc = new models.Vehicle({
        id: newId,
        owner_id: req.user ? req.user.id : 1,
        vehicle_number: cleanVehicleNumber,
        brand: cleanBrand,
        model: cleanModel,
        vehicle_type: cleanType,
        fuel_type: cleanFuel,
        transmission: cleanTransmission,
        seating_capacity: cleanSeats,
        rental_price: cleanPrice,
        status: 'Available',
        image_url: cleanImage,
        location: cleanLocation,
        mileage: cleanMileage,
        featured: false,
        rating: 5.0
      });

      const saved = await newVehicleDoc.save();
      const resVehicle = { ...saved.toObject(), id: saved.id || saved._id.toString() };

      console.log(`✅ [MongoDB Saved] Added vehicle #${resVehicle.id}: ${cleanBrand} ${cleanModel} (${cleanVehicleNumber}) to MongoDB collection`);

      return res.status(201).json({
        success: true,
        message: 'Vehicle successfully saved permanently in MongoDB database.',
        database: 'MongoDB',
        storage_engine: 'MongoDB',
        vehicleId: resVehicle.id,
        vehicle: resVehicle
      });
    }

    if (process.env.DB_TYPE === 'mongodb') {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is configured as primary database (DB_TYPE=mongodb) but is currently not reachable on port 27017. Please start your MongoDB service.'
      });
    }

    // 2. MySQL Database
    if (isDbConnected()) {
      const existing = await query('SELECT id, vehicle_number FROM vehicles WHERE UPPER(vehicle_number) = ?', [cleanVehicleNumber]);
      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: `A vehicle with plate number "${cleanVehicleNumber}" already exists in the fleet.`
        });
      }

      let resolvedOwnerId = req.user && req.user.id ? req.user.id : 1;
      try {
        const userExists = await query('SELECT id FROM users WHERE id = ?', [resolvedOwnerId]);
        if (!userExists || userExists.length === 0) {
          const firstAdmin = await query('SELECT id FROM users WHERE role_id = 1 LIMIT 1');
          resolvedOwnerId = firstAdmin.length > 0 ? firstAdmin[0].id : null;
        }
      } catch (checkErr) {
        resolvedOwnerId = null;
      }

      const result = await query(
        `INSERT INTO vehicles (
          owner_id, vehicle_number, brand, model, vehicle_type, fuel_type,
          transmission, seating_capacity, rental_price, status, image_url, location, mileage, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?, 0)`,
        [
          resolvedOwnerId,
          cleanVehicleNumber,
          cleanBrand,
          cleanModel,
          cleanType,
          cleanFuel,
          cleanTransmission,
          cleanSeats,
          cleanPrice,
          cleanImage,
          cleanLocation,
          cleanMileage
        ]
      );

      const insertedId = result.insertId;
      const rows = await query('SELECT * FROM vehicles WHERE id = ?', [insertedId]);
      const newVehicle = rows && rows.length > 0 ? rows[0] : {
        id: insertedId,
        owner_id: resolvedOwnerId,
        vehicle_number: cleanVehicleNumber,
        brand: cleanBrand,
        model: cleanModel,
        vehicle_type: cleanType,
        fuel_type: cleanFuel,
        transmission: cleanTransmission,
        seating_capacity: cleanSeats,
        rental_price: cleanPrice,
        status: 'Available',
        image_url: cleanImage,
        location: cleanLocation,
        mileage: cleanMileage
      };

      console.log(`✅ [MySQL] Successfully added vehicle #${insertedId}: ${cleanBrand} ${cleanModel} (${cleanVehicleNumber})`);

      return res.status(201).json({
        success: true,
        message: 'Vehicle successfully added to MySQL database.',
        vehicleId: insertedId,
        vehicle: newVehicle
      });
    }

    // 3. In-memory Mock Store Fallback
    const existing = mockStore.vehicles.find(v => v.vehicle_number && v.vehicle_number.toUpperCase() === cleanVehicleNumber);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A vehicle with plate number "${cleanVehicleNumber}" already exists in the fleet.`
      });
    }

    const newId = mockStore.vehicles.length > 0 ? Math.max(...mockStore.vehicles.map(v => v.id)) + 1 : 1;
    const newVehicle = {
      id: newId,
      owner_id: req.user ? req.user.id : 1,
      vehicle_number: cleanVehicleNumber,
      brand: cleanBrand,
      model: cleanModel,
      vehicle_type: cleanType,
      fuel_type: cleanFuel,
      transmission: cleanTransmission,
      seating_capacity: cleanSeats,
      rental_price: cleanPrice,
      status: 'Available',
      image_url: cleanImage,
      location: cleanLocation,
      mileage: cleanMileage,
      featured: 0,
      rating: 5.0
    };

    mockStore.vehicles.unshift(newVehicle);
    return res.status(201).json({
      success: true,
      message: 'Vehicle added successfully (in-memory mode)',
      vehicleId: newId,
      vehicle: newVehicle
    });
  } catch (err) {
    console.error('Error in createVehicle:', err);
    if (err.code === 11000 || err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A vehicle with this registration plate number already exists.'
      });
    }
    next(err);
  }
}

// PUT /api/vehicles/:id
async function updateVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const { brand, model, rental_price, status, image_url, location, mileage } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Vehicle) {
      const updates = {};
      if (brand) updates.brand = brand.trim();
      if (model) updates.model = model.trim();
      if (rental_price) updates.rental_price = parseFloat(rental_price);
      if (status) updates.status = status.trim();
      if (image_url) updates.image_url = image_url.trim();
      if (location) updates.location = location.trim();
      if (mileage) updates.mileage = parseInt(mileage);

      let updated = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        updated = await models.Vehicle.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!updated && !isNaN(id)) {
        updated = await models.Vehicle.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      if (!updated) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      return res.json({ success: true, message: 'Vehicle updated successfully', vehicle: updated });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const updates = [];
      const params = [];

      if (brand) { updates.push('brand = ?'); params.push(brand); }
      if (model) { updates.push('model = ?'); params.push(model); }
      if (rental_price) { updates.push('rental_price = ?'); params.push(parseFloat(rental_price)); }
      if (status) { updates.push('status = ?'); params.push(status); }
      if (image_url) { updates.push('image_url = ?'); params.push(image_url); }
      if (location) { updates.push('location = ?'); params.push(location); }
      if (mileage) { updates.push('mileage = ?'); params.push(parseInt(mileage)); }

      if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(id);
      await query(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`, params);
      return res.json({ success: true, message: 'Vehicle updated successfully' });
    }

    // 3. Fallback
    const v = mockStore.vehicles.find(item => item.id === parseInt(id));
    if (!v) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    if (brand) v.brand = brand;
    if (model) v.model = model;
    if (rental_price) v.rental_price = parseFloat(rental_price);
    if (status) v.status = status;
    if (image_url) v.image_url = image_url;
    if (location) v.location = location;
    if (mileage) v.mileage = parseInt(mileage);

    return res.json({ success: true, message: 'Vehicle updated successfully', vehicle: v });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/vehicles/:id
async function deleteVehicle(req, res, next) {
  try {
    const { id } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.Vehicle) {
      let deleted = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        deleted = await models.Vehicle.findByIdAndDelete(id);
      }
      if (!deleted && !isNaN(id)) {
        deleted = await models.Vehicle.findOneAndDelete({ id: parseInt(id) });
      }
      if (!deleted) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      return res.json({ success: true, message: 'Vehicle deleted successfully from MongoDB' });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('DELETE FROM vehicles WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Vehicle deleted successfully' });
    }

    // 3. Fallback
    const idx = mockStore.vehicles.findIndex(v => v.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    mockStore.vehicles.splice(idx, 1);
    return res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVehicles,
  getAvailableVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
