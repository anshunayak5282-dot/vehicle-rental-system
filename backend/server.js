const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const errorHandler = require('./middleware/errorMiddleware');
const { isMongoConnected, connectMongo, models, mongoose, purgeDummyData } = require('./config/mongodb');
const { isDbConnected, initDb } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files directly from Express for convenience
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Health & Detailed Database Diagnostic Status
app.get('/api/health', async (req, res) => {
  const mongoOk = isMongoConnected();
  let userCount = 0;
  let vehicleCount = 0;
  if (mongoOk && models.User && models.Vehicle) {
    try {
      userCount = await models.User.countDocuments();
      vehicleCount = await models.Vehicle.countDocuments();
    } catch (e) {}
  }

  res.json({
    status: 'ONLINE',
    system: 'Vehicle Rental System REST API',
    databases: {
      mongodb: mongoOk ? 'CONNECTED' : 'UNREACHABLE / STANDBY',
      mysql: isDbConnected() ? 'CONNECTED' : 'STANDBY'
    },
    mongodb_stats: {
      connected: mongoOk,
      readyState: mongoose && mongoose.connection ? mongoose.connection.readyState : 0,
      uri: (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_rental').replace(/\/\/.*@/, '//***@'),
      users_stored: userCount,
      vehicles_stored: vehicleCount
    },
    version: '1.2.0',
    timestamp: new Date().toISOString()
  });
});

// Database Status Route
app.get('/api/database/status', async (req, res) => {
  const mongoOk = isMongoConnected();
  let userCount = 0;
  let vehicleCount = 0;
  let customerCount = 0;
  let bookingCount = 0;

  if (mongoOk) {
    try {
      if (models.User) userCount = await models.User.countDocuments();
      if (models.Customer) customerCount = await models.Customer.countDocuments();
      if (models.Vehicle) vehicleCount = await models.Vehicle.countDocuments();
      if (models.Booking) bookingCount = await models.Booking.countDocuments();
    } catch (err) {}
  }

  res.json({
    success: true,
    active_database: mongoOk ? 'MongoDB' : (isDbConnected() ? 'MySQL' : 'MockFallback'),
    mongodb: {
      connected: mongoOk,
      readyState: mongoose && mongoose.connection ? mongoose.connection.readyState : 0,
      uri: (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_rental').replace(/\/\/.*@/, '//***@'),
      collections: {
        users: userCount,
        customers: customerCount,
        vehicles: vehicleCount,
        bookings: bookingCount
      }
    },
    mysql: {
      connected: isDbConnected(),
      name: process.env.DB_NAME || 'vehicle_rental'
    }
  });
});

// Preview candidate dummy data before deletion
app.get('/api/database/preview-dummy', async (req, res) => {
  if (!isMongoConnected()) {
    return res.status(503).json({ success: false, message: 'MongoDB is not connected.' });
  }

  try {
    const dummyUsers = await models.User.find({ email: 'customer@gmail.com' }).lean();
    const dummyCustomers = await models.Customer.find({ full_name: 'Sarah Jenkins' }).lean();
    const dummyBookings = await models.Booking.find({ customer_email: 'customer@gmail.com' }).lean();
    const dummyPayments = await models.Payment.find({ customer_name: 'Sarah Jenkins' }).lean();
    const dummyMaintenance = await models.Maintenance.find({ mechanic_name: 'Viktor Ramos' }).lean();
    const dummyInsurance = await models.Insurance.find({ policy_number: 'POL-TY-9921' }).lean();

    res.json({
      success: true,
      preview: {
        users: dummyUsers.map(u => ({ id: u.id || u._id, full_name: u.full_name, email: u.email, role: u.role })),
        customers: dummyCustomers.map(c => ({ id: c._id, full_name: c.full_name, license_number: c.license_number })),
        bookings: dummyBookings.map(b => ({ id: b.id || b._id, booking_code: b.booking_code, vehicle_name: b.vehicle_name, total_amount: b.total_amount })),
        payments: dummyPayments.map(p => ({ id: p.id || p._id, transaction_id: p.transaction_id, amount: p.amount })),
        maintenance: dummyMaintenance.map(m => ({ id: m.id || m._id, vehicle_name: m.vehicle_name, mechanic_name: m.mechanic_name, cost: m.cost })),
        insurance: dummyInsurance.map(i => ({ id: i.id || i._id, policy_number: i.policy_number, vehicle_name: i.vehicle_name }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Purge dummy data only upon explicit user confirmation
app.post('/api/database/clean-dummy', async (req, res) => {
  if (!req.body || req.body.confirm !== true) {
    return res.status(400).json({ success: false, message: 'Explicit confirmation required. Send { "confirm": true }.' });
  }

  if (!isMongoConnected()) {
    return res.status(503).json({ success: false, message: 'MongoDB is not connected.' });
  }

  try {
    const deletedCounts = await purgeDummyData();
    res.json({
      success: true,
      message: 'Unwanted dummy data removed successfully from MongoDB.',
      deleted_counts: deletedCounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/reports', reportRoutes);

// Fallback route to serve index.html for root if accessed via server
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Central Error Handling
app.use(errorHandler);

// Asynchronously initialize database connections before listening
async function startServer() {
  console.log('🔄 Initializing database engines...');
  await connectMongo().catch(err => {
    console.warn('⚠️ Initial MongoDB connection notice:', err.message);
  });

  if (process.env.DB_TYPE !== 'mongodb') {
    await initDb().catch(err => {
      console.warn('⚠️ Initial MySQL connection notice:', err.message);
    });
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Apex Fleet Vehicle Rental System Server Started`);
    console.log(`📡 REST API available at: http://localhost:${PORT}/api`);
    console.log(`🌐 Web UI served at:      http://localhost:${PORT}`);
    console.log(`🍃 MongoDB Engine:        ${isMongoConnected() ? 'ONLINE (Connected)' : 'OFFLINE / UNREACHABLE'}`);
    console.log(`🐬 MySQL Engine:          ${isDbConnected() ? 'ONLINE (Connected)' : 'STANDBY'}`);
    console.log(`📁 Primary DB Mode:       ${process.env.DB_TYPE || 'mongodb'}`);
    console.log(`=======================================================`);
  });
}

startServer();

module.exports = app;
