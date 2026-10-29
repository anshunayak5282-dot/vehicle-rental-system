const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/reports/bookings
async function getBookingReports(req, res, next) {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      const bList = await models.Booking.find({}).lean();
      const report = {
        total_bookings: bList.length,
        completed_bookings: bList.filter(b => b.status === 'Completed').length,
        active_bookings: bList.filter(b => b.status === 'Active').length,
        confirmed_bookings: bList.filter(b => b.status === 'Confirmed').length,
        pending_bookings: bList.filter(b => b.status === 'Pending').length,
        cancelled_bookings: bList.filter(b => b.status === 'Cancelled').length,
        total_booking_value: bList.reduce((acc, b) => acc + (b.total_amount || 0), 0)
      };
      return res.json({ success: true, report });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const stats = await query(`
        SELECT
          COUNT(*) AS total_bookings,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_bookings,
          SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_bookings,
          SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_bookings,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,
          COALESCE(SUM(total_amount), 0) AS total_booking_value
        FROM bookings
      `);
      return res.json({ success: true, report: stats[0] });
    }

    // 3. Fallback
    const bList = mockStore.bookings;
    const report = {
      total_bookings: bList.length,
      completed_bookings: bList.filter(b => b.status === 'Completed').length,
      active_bookings: bList.filter(b => b.status === 'Active').length,
      confirmed_bookings: bList.filter(b => b.status === 'Confirmed').length,
      pending_bookings: bList.filter(b => b.status === 'Pending').length,
      cancelled_bookings: bList.filter(b => b.status === 'Cancelled').length,
      total_booking_value: bList.reduce((acc, b) => acc + (b.total_amount || 0), 0)
    };
    return res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/revenue
async function getRevenueReports(req, res, next) {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Payment) {
      const pList = await models.Payment.find({}).lean();
      const report = {
        gross_revenue: pList.reduce((acc, p) => acc + (p.amount || 0), 0),
        total_transactions: pList.length,
        collected_revenue: pList.filter(p => p.status === 'Paid').reduce((acc, p) => acc + (p.amount || 0), 0),
        refunded_revenue: pList.filter(p => p.status === 'Refunded').reduce((acc, p) => acc + (p.amount || 0), 0)
      };
      return res.json({ success: true, report });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rev = await query(`
        SELECT
          COALESCE(SUM(amount), 0) AS gross_revenue,
          COUNT(*) AS total_transactions,
          SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) AS collected_revenue,
          SUM(CASE WHEN status = 'Refunded' THEN amount ELSE 0 END) AS refunded_revenue
        FROM payments
      `);
      return res.json({ success: true, report: rev[0] });
    }

    // 3. Fallback
    const pList = mockStore.payments;
    const report = {
      gross_revenue: pList.reduce((acc, p) => acc + (p.amount || 0), 0),
      total_transactions: pList.length,
      collected_revenue: pList.filter(p => p.status === 'Paid').reduce((acc, p) => acc + (p.amount || 0), 0),
      refunded_revenue: pList.filter(p => p.status === 'Refunded').reduce((acc, p) => acc + (p.amount || 0), 0)
    };
    return res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/vehicles
async function getVehicleReports(req, res, next) {
  try {
    // 1. MongoDB
    if (isMongoConnected() && models.Vehicle) {
      const vList = await models.Vehicle.find({}).lean();
      const report = {
        total_vehicles: vList.length,
        available_count: vList.filter(v => v.status === 'Available').length,
        booked_count: vList.filter(v => v.status === 'Booked').length,
        rented_count: vList.filter(v => v.status === 'Rented').length,
        maintenance_count: vList.filter(v => v.status === 'Under Maintenance').length
      };
      return res.json({ success: true, report });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const vStats = await query(`
        SELECT
          COUNT(*) AS total_vehicles,
          SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available_count,
          SUM(CASE WHEN status = 'Booked' THEN 1 ELSE 0 END) AS booked_count,
          SUM(CASE WHEN status = 'Rented' THEN 1 ELSE 0 END) AS rented_count,
          SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) AS maintenance_count
        FROM vehicles
      `);
      return res.json({ success: true, report: vStats[0] });
    }

    // 3. Fallback
    const vList = mockStore.vehicles;
    const report = {
      total_vehicles: vList.length,
      available_count: vList.filter(v => v.status === 'Available').length,
      booked_count: vList.filter(v => v.status === 'Booked').length,
      rented_count: vList.filter(v => v.status === 'Rented').length,
      maintenance_count: vList.filter(v => v.status === 'Under Maintenance').length
    };
    return res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/maintenance
async function getMaintenanceReports(req, res, next) {
  try {
    // 1. MongoDB
    if (isMongoConnected() && models.Maintenance) {
      const mList = await models.Maintenance.find({}).lean();
      const report = {
        total_services: mList.length,
        total_maintenance_cost: mList.reduce((acc, m) => acc + (m.cost || 0), 0),
        in_progress_services: mList.filter(m => m.status === 'In Progress').length,
        completed_services: mList.filter(m => m.status === 'Completed').length
      };
      return res.json({ success: true, report });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const mStats = await query(`
        SELECT
          COUNT(*) AS total_services,
          COALESCE(SUM(cost), 0) AS total_maintenance_cost,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_services,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_services
        FROM maintenance
      `);
      return res.json({ success: true, report: mStats[0] });
    }

    // 3. Fallback
    const mList = mockStore.maintenanceRecords;
    const report = {
      total_services: mList.length,
      total_maintenance_cost: mList.reduce((acc, m) => acc + (m.cost || 0), 0),
      in_progress_services: mList.filter(m => m.status === 'In Progress').length,
      completed_services: mList.filter(m => m.status === 'Completed').length
    };
    return res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBookingReports,
  getRevenueReports,
  getVehicleReports,
  getMaintenanceReports
};
