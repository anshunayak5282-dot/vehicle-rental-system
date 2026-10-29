const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/bookings
async function getBookings(req, res, next) {
  try {
    const { status, customer_id, vehicle_id } = req.query;
    const user = req.user;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      const filter = {};
      if (user && user.role === 'customer') {
        filter.customer_id = user.id;
      } else if (customer_id) {
        filter.customer_id = customer_id;
      }
      if (user && user.role === 'driver') {
        filter.driver_id = user.id;
      }
      if (vehicle_id) {
        filter.vehicle_id = vehicle_id;
      }
      if (status && status !== 'all') {
        filter.status = new RegExp(`^${status.trim()}$`, 'i');
      }

      const docs = await models.Booking.find(filter).sort({ id: -1, _id: -1 }).lean();
      const bookings = docs.map(b => ({ ...b, id: b.id || b._id.toString() }));
      return res.json({ success: true, count: bookings.length, bookings });
    }

    // 2. MySQL
    if (isDbConnected()) {
      let sql = `
        SELECT b.*,
               u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
               v.brand, v.model, v.vehicle_number, v.image_url AS vehicle_image,
               d.name AS driver_name
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        JOIN vehicles v ON b.vehicle_id = v.id
        LEFT JOIN users d ON b.driver_id = d.id
        WHERE 1=1
      `;
      const params = [];

      if (user && user.role === 'customer') {
        sql += ' AND b.customer_id = ?';
        params.push(user.id);
      } else if (customer_id) {
        sql += ' AND b.customer_id = ?';
        params.push(customer_id);
      }

      if (user && user.role === 'driver') {
        sql += ' AND b.driver_id = ?';
        params.push(user.id);
      }

      if (vehicle_id) {
        sql += ' AND b.vehicle_id = ?';
        params.push(vehicle_id);
      }

      if (status && status !== 'all') {
        sql += ' AND b.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY b.id DESC';
      const rows = await query(sql, params);
      return res.json({ success: true, count: rows.length, bookings: rows });
    }

    // 3. Fallback
    let list = [...mockStore.bookings];

    if (user && user.role === 'customer') {
      list = list.filter(b => b.customer_id === user.id);
    } else if (customer_id) {
      list = list.filter(b => b.customer_id === parseInt(customer_id));
    }

    if (user && user.role === 'driver') {
      list = list.filter(b => b.driver_id === user.id);
    }

    if (status && status !== 'all') {
      list = list.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }

    return res.json({ success: true, count: list.length, bookings: list });
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/:id
async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      let booking = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        booking = await models.Booking.findById(id).lean();
      }
      if (!booking && !isNaN(id)) {
        booking = await models.Booking.findOne({ id: parseInt(id) }).lean();
      }
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, booking: { ...booking, id: booking.id || booking._id.toString() } });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query(
        `SELECT b.*,
                u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
                v.brand, v.model, v.vehicle_number, v.image_url AS vehicle_image,
                d.name AS driver_name
         FROM bookings b
         JOIN users u ON b.customer_id = u.id
         JOIN vehicles v ON b.vehicle_id = v.id
         LEFT JOIN users d ON b.driver_id = d.id
         WHERE b.id = ?`,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, booking: rows[0] });
    }

    // 3. Fallback
    const booking = mockStore.bookings.find(b => b.id === parseInt(id));
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    return res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

// POST /api/bookings
async function createBooking(req, res, next) {
  try {
    const {
      vehicle_id, start_date, end_date, driver_required = false,
      insurance_opted = true, pickup_location, drop_location, notes
    } = req.body;

    if (!vehicle_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Vehicle and rental dates are required.' });
    }

    const customer_id = req.user ? req.user.id : 2;
    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffTime = Math.abs(end - start);
    const total_days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Booking && models.Vehicle) {
      // Strict Profile Completeness Check (100% Required for Reservations)
      let customerUser = null;
      if (req.user && req.user._id) {
        customerUser = await models.User.findById(req.user._id).lean();
      }
      if (!customerUser && req.user && req.user.id) {
        if (!isNaN(req.user.id)) {
          customerUser = await models.User.findOne({ id: parseInt(req.user.id) }).lean();
        } else if (String(req.user.id).match(/^[0-9a-fA-F]{24}$/)) {
          customerUser = await models.User.findById(req.user.id).lean();
        }
      }
      if (!customerUser && req.user && req.user.email) {
        customerUser = await models.User.findOne({ email: req.user.email }).lean();
      }

      let customerProfile = null;
      if (customerUser && models.Customer) {
        customerProfile = await models.Customer.findOne({ user_id: customerUser._id }).lean();
      }

      if (customerUser) {
        const missingFields = [];
        const fullName = (customerUser.full_name || customerUser.name || (customerProfile ? (customerProfile.full_name || customerProfile.name) : '') || '').trim();
        if (!fullName) missingFields.push('Full Name');

        const phone = (customerUser.phone || '').trim();
        if (!phone) missingFields.push('Phone Number');

        const license = (customerUser.license_number || (customerProfile ? customerProfile.license_number : '') || '').trim();
        if (!license) missingFields.push('Driving License Number');

        const cityVal = (customerUser.city || (customerProfile ? customerProfile.city : '') || '').trim();
        if (!cityVal) missingFields.push('City');

        const postalVal = (customerUser.postal_code || (customerProfile ? customerProfile.postal_code : '') || '').trim();
        if (!postalVal) missingFields.push('Postal Code / PIN');

        const addressVal = (customerUser.address || (customerProfile ? customerProfile.address : '') || '').trim();
        if (!addressVal) missingFields.push('Residential Address');

        const avatarVal = (customerUser.avatar_url || (customerProfile ? customerProfile.avatar_url : '') || '').trim();
        if (!avatarVal) missingFields.push('Profile Photo');

        if (missingFields.length > 0) {
          const completedCount = 7 - missingFields.length;
          const completionPercentage = Math.round((completedCount / 7) * 100);
          return res.status(403).json({
            success: false,
            profile_incomplete: true,
            completion_percentage: completionPercentage,
            missing_fields: missingFields,
            message: `Profile is only ${completionPercentage}% complete. 100% completion is mandatory before reserving a vehicle. Missing: ${missingFields.join(', ')}.`
          });
        }
      }

      let vehicle = null;
      if (String(vehicle_id).match(/^[0-9a-fA-F]{24}$/)) {
        vehicle = await models.Vehicle.findById(vehicle_id).lean();
      }
      if (!vehicle && !isNaN(vehicle_id)) {
        vehicle = await models.Vehicle.findOne({ id: parseInt(vehicle_id) }).lean();
      }
      if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

      const daily_rate = parseFloat(vehicle.rental_price) || 15000;
      let total_amount = daily_rate * total_days;
      if (driver_required) total_amount += 1500 * total_days;
      if (insurance_opted) total_amount += 1000 * total_days;
      const final_total = Math.round(total_amount * 1.1);

      const count = await models.Booking.countDocuments();
      const newId = count + 1;
      const bookingCode = `BK-${new Date().getFullYear()}-${100 + newId}`;

      const newBooking = new models.Booking({
        id: newId,
        booking_code: bookingCode,
        customer_id,
        customer_name: req.user ? (req.user.full_name || req.user.name) : (req.body.customer_name || 'Customer User'),
        customer_email: req.user ? req.user.email : (req.body.customer_email || 'customer@gmail.com'),
        customer_phone: req.user ? req.user.phone : (req.body.customer_phone || '+91 98201 00000'),
        vehicle_id: vehicle.id || vehicle._id.toString(),
        vehicle_name: `${vehicle.brand} ${vehicle.model}`,
        vehicle_number: vehicle.vehicle_number,
        vehicle_image: vehicle.image_url,
        driver_id: driver_required ? 4 : null,
        driver_name: driver_required ? 'David Rodriguez' : 'Self-Drive',
        start_date,
        end_date,
        total_days,
        daily_rate,
        total_amount: final_total,
        driver_required: Boolean(driver_required),
        insurance_opted: Boolean(insurance_opted),
        pickup_location: pickup_location || vehicle.location || 'Mumbai - BKC Hub',
        drop_location: drop_location || vehicle.location || 'Mumbai - BKC Hub',
        status: 'Pending',
        payment_status: 'Unpaid',
        notes: notes || ''
      });

      const saved = await newBooking.save();
      const retBooking = { ...saved.toObject(), id: saved.id || saved._id.toString() };

      console.log(`✅ [MongoDB Saved] Booking #${newId} saved to MongoDB collection "bookings"`);

      return res.status(201).json({
        success: true,
        message: 'Booking request created successfully in MongoDB database.',
        database: 'MongoDB',
        storage_engine: 'MongoDB',
        bookingId: retBooking.id,
        booking: retBooking,
        total_amount: final_total
      });
    }

    if (process.env.DB_TYPE === 'mongodb') {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is configured as primary database (DB_TYPE=mongodb) but is currently not reachable on port 27017. Please start your MongoDB service.'
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const vRows = await query('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
      if (vRows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      const vehicle = vRows[0];

      const daily_rate = parseFloat(vehicle.rental_price);
      let total_amount = daily_rate * total_days;
      if (driver_required) total_amount += 1500 * total_days;
      if (insurance_opted) total_amount += 1000 * total_days;

      const result = await query(
        `INSERT INTO bookings (customer_id, vehicle_id, start_date, end_date, total_days, daily_rate, total_amount, driver_required, insurance_opted, pickup_location, drop_location, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [
          customer_id, vehicle_id, start_date, end_date, total_days, daily_rate, total_amount,
          driver_required ? 1 : 0, insurance_opted ? 1 : 0,
          pickup_location || 'Mumbai - BKC Hub', drop_location || 'Mumbai - BKC Hub', notes || null
        ]
      );

      const bookingId = result.insertId;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(bookingId).padStart(4, '0')}`;
      await query(
        `INSERT INTO invoices (booking_id, invoice_number, subtotal, tax_amount, final_amount, status)
         VALUES (?, ?, ?, ?, ?, 'Unpaid')`,
        [bookingId, invoiceNumber, total_amount, (total_amount * 0.1).toFixed(2), (total_amount * 1.1).toFixed(2)]
      );

      return res.status(201).json({
        success: true,
        message: 'Booking request created successfully. Awaiting verification and manager approval.',
        bookingId,
        invoiceNumber,
        total_amount: (total_amount * 1.1).toFixed(2)
      });
    }

    // 3. Fallback
    const v = mockStore.vehicles.find(item => item.id === parseInt(vehicle_id));
    const daily_rate = v ? v.rental_price : 15000;
    let total_amount = daily_rate * total_days;
    if (driver_required) total_amount += 1500 * total_days;
    if (insurance_opted) total_amount += 1000 * total_days;
    const final_total = Math.round(total_amount * 1.1);

    const newId = mockStore.bookings.length + 1;
    const bookingCode = `BK-${new Date().getFullYear()}-${100 + newId}`;
    const newBooking = {
      id: newId,
      booking_code: bookingCode,
      customer_id,
      customer_name: req.user ? req.user.name : 'Sarah Jenkins',
      customer_email: req.user ? req.user.email : 'customer@gmail.com',
      customer_phone: '+91 98201 10102',
      vehicle_id: parseInt(vehicle_id),
      vehicle_name: v ? `${v.brand} ${v.model}` : 'Premium Vehicle',
      vehicle_number: v ? v.vehicle_number : 'MH 02 CZ 7701',
      vehicle_image: v ? v.image_url : '',
      driver_id: driver_required ? 4 : null,
      driver_name: driver_required ? 'David Rodriguez' : 'Self-Drive',
      start_date,
      end_date,
      total_days,
      daily_rate,
      total_amount: final_total,
      driver_required: Boolean(driver_required),
      insurance_opted: Boolean(insurance_opted),
      pickup_location: pickup_location || 'Mumbai - BKC Hub',
      drop_location: drop_location || 'Mumbai - BKC Hub',
      status: 'Pending',
      payment_status: 'Pending',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    mockStore.bookings.unshift(newBooking);

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully!',
      booking: newBooking
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/bookings/:id/approve
async function approveBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      const updates = { status: 'Approved' };
      if (driver_id) updates.driver_id = driver_id;
      let b = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        b = await models.Booking.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!b && !isNaN(id)) {
        b = await models.Booking.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, message: 'Booking approved successfully in MongoDB', booking: b });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query(
        'UPDATE bookings SET status = "Approved", driver_id = COALESCE(?, driver_id) WHERE id = ?',
        [driver_id || null, id]
      );
      return res.json({ success: true, message: 'Booking approved successfully.' });
    }

    // 3. Fallback
    const b = mockStore.bookings.find(item => item.id === parseInt(id));
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    b.status = 'Approved';
    if (driver_id) {
      b.driver_id = parseInt(driver_id);
      b.driver_name = 'David Rodriguez';
    }
    return res.json({ success: true, message: 'Booking approved successfully.', booking: b });
  } catch (err) {
    next(err);
  }
}

// PUT /api/bookings/:id/reject
async function rejectBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      const updates = { status: 'Rejected' };
      let b = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        b = await models.Booking.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!b && !isNaN(id)) {
        b = await models.Booking.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, message: 'Booking rejected in MongoDB', booking: b });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('UPDATE bookings SET status = "Rejected", notes = CONCAT(IFNULL(notes, ""), " [Rejected: ", ?, "]") WHERE id = ?', [reason || 'Manager rejection', id]);
      return res.json({ success: true, message: 'Booking rejected.' });
    }

    // 3. Fallback
    const b = mockStore.bookings.find(item => item.id === parseInt(id));
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    b.status = 'Rejected';
    b.notes = (b.notes ? b.notes + ' ' : '') + `[Rejected: ${reason || 'Denied by manager'}]`;
    return res.json({ success: true, message: 'Booking rejected.', booking: b });
  } catch (err) {
    next(err);
  }
}

// PUT /api/bookings/:id/cancel
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      const updates = { status: 'Cancelled' };
      let b = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        b = await models.Booking.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!b && !isNaN(id)) {
        b = await models.Booking.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, message: 'Booking cancelled in MongoDB', booking: b });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Booking cancelled.' });
    }

    // 3. Fallback
    const b = mockStore.bookings.find(item => item.id === parseInt(id));
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    b.status = 'Cancelled';
    return res.json({ success: true, message: 'Booking cancelled.', booking: b });
  } catch (err) {
    next(err);
  }
}

// PUT /api/bookings/:id
async function updateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { status, driver_id, vehicle_id } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      const updates = {};
      if (status) updates.status = status;
      if (driver_id) updates.driver_id = driver_id;
      if (vehicle_id) updates.vehicle_id = vehicle_id;

      let b = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        b = await models.Booking.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!b && !isNaN(id)) {
        b = await models.Booking.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, message: 'Booking updated successfully in MongoDB', booking: b });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const updates = [];
      const params = [];
      if (status) { updates.push('status = ?'); params.push(status); }
      if (driver_id) { updates.push('driver_id = ?'); params.push(driver_id); }
      if (vehicle_id) { updates.push('vehicle_id = ?'); params.push(vehicle_id); }
      params.push(id);
      await query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, params);
      return res.json({ success: true, message: 'Booking updated successfully' });
    }

    // 3. Fallback
    const b = mockStore.bookings.find(item => item.id === parseInt(id));
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (status) b.status = status;
    if (driver_id) b.driver_id = driver_id;
    if (vehicle_id) b.vehicle_id = vehicle_id;
    return res.json({ success: true, message: 'Booking updated successfully', booking: b });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bookings/:id
async function deleteBooking(req, res, next) {
  try {
    const { id } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      let deleted = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        deleted = await models.Booking.findByIdAndDelete(id);
      }
      if (!deleted && !isNaN(id)) {
        deleted = await models.Booking.findOneAndDelete({ id: parseInt(id) });
      }
      if (!deleted) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, message: 'Booking deleted from MongoDB' });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('DELETE FROM bookings WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Booking deleted' });
    }

    // 3. Fallback
    const idx = mockStore.bookings.findIndex(b => b.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Booking not found' });
    mockStore.bookings.splice(idx, 1);
    return res.json({ success: true, message: 'Booking deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  approveBooking,
  rejectBooking,
  cancelBooking,
  updateBooking,
  deleteBooking
};
