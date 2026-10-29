const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const initModels = require('../models');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (err) {
  // Mongoose is not yet installed in node_modules
}

let isConnected = false;
// Initialize Mongoose models immediately so controllers have access to schemas at all times
const models = mongoose ? initModels(mongoose) : {};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_rental';

// Seed initial data for MongoDB if collections are empty, populating separate role collections
async function autoSeedIfEmpty() {
  if (!isConnected || !models.Vehicle || !models.User) return;

  try {
    const vehicleCount = await models.Vehicle.countDocuments();
    if (vehicleCount === 0) {
      console.log('🍃 MongoDB collections are empty. Auto-seeding initial fleet and separated role accounts...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      // 1. Core Administrative & Operations Staff Users (3 System Roles)
      const usersToInsert = [
        {
          id: 1,
          name: 'Alexander Vance',
          full_name: 'Alexander Vance',
          email: 'admin@apexrentals.com',
          password: hashedPassword,
          phone: '+91 98201 00001',
          role: 'admin',
          role_id: 1,
          status: 'active',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        },
        {
          id: 2,
          name: 'Eleanor Cross',
          full_name: 'Eleanor Cross',
          email: 'manager@apexrentals.com',
          password: hashedPassword,
          phone: '+91 98111 00004',
          role: 'manager',
          role_id: 3,
          status: 'active',
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
        },
        {
          id: 3,
          name: 'David Rodriguez',
          full_name: 'David Rodriguez',
          email: 'driver@apexrentals.com',
          password: hashedPassword,
          phone: '+91 98450 00005',
          role: 'driver',
          role_id: 4,
          status: 'active',
          rating: 4.95,
          total_trips: 148,
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
        }
      ];

      for (const u of usersToInsert) {
        const userDoc = await models.User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });

        // Populate separate role-based collections with full_name, name, and role
        if (u.role === 'admin' && models.Admin) {
          const adminDoc = await models.Admin.findOneAndUpdate(
            { user_id: userDoc._id },
            {
              user_id: userDoc._id,
              user_num_id: userDoc.id,
              full_name: u.full_name || u.name,
              name: u.name || u.full_name,
              role: 'admin',
              admin_level: 'Super Admin',
              department: 'Executive Governance'
            },
            { upsert: true, new: true }
          );
          userDoc.role_profile_id = adminDoc._id;
          await userDoc.save();
        } else if (u.role === 'manager' && models.Manager) {
          const mgrDoc = await models.Manager.findOneAndUpdate(
            { user_id: userDoc._id },
            {
              user_id: userDoc._id,
              user_num_id: userDoc.id,
              full_name: u.full_name || u.name,
              name: u.name || u.full_name,
              role: 'manager',
              hub_assigned: 'Mumbai - BKC Hub',
              managed_hubs: ['Mumbai - BKC Hub', 'Mumbai - Worli Hub', 'Goa - Coastal Suite']
            },
            { upsert: true, new: true }
          );
          userDoc.role_profile_id = mgrDoc._id;
          await userDoc.save();
        } else if (u.role === 'driver' && models.Driver) {
          const drvDoc = await models.Driver.findOneAndUpdate(
            { user_id: userDoc._id },
            {
              user_id: userDoc._id,
              user_num_id: userDoc.id,
              full_name: u.full_name || u.name,
              name: u.name || u.full_name,
              role: 'driver',
              license_number: 'DL-MH-COMM-7788',
              experience_years: 6,
              rating: 4.95,
              total_trips: 148
            },
            { upsert: true, new: true }
          );
          userDoc.role_profile_id = drvDoc._id;
          await userDoc.save();
        }
      }

      // 2. Fleet Vehicles
      const vehiclesToInsert = [
        { id: 1, owner_id: 1, vehicle_number: 'MH 02 CZ 7701', brand: 'Porsche', model: 'Taycan 4S Electric', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 22000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800', location: 'Mumbai - BKC Hub', mileage: 8200, featured: true, rating: 4.95 },
        { id: 2, owner_id: 1, vehicle_number: 'DL 01 AB 0402', brand: 'Mercedes-Benz', model: 'S-Class 580', vehicle_type: 'Luxury Sedan', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 18000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', location: 'Delhi NCR - IGI Airport T3', mileage: 12400, featured: true, rating: 4.90 },
        { id: 3, owner_id: 1, vehicle_number: 'KA 03 MX 0908', brand: 'BMW', model: 'X7 M50i Luxury SUV', vehicle_type: 'SUV', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 7, rental_price: 16000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', location: 'Bengaluru - UB City Hub', mileage: 16500, featured: true, rating: 4.88 },
        { id: 4, owner_id: 1, vehicle_number: 'TS 09 EV 0552', brand: 'Audi', model: 'RS e-tron GT', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 24000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800', location: 'Hyderabad - HITEC City', mileage: 6400, featured: true, rating: 4.92 },
        { id: 5, owner_id: 1, vehicle_number: 'GA 07 EV 0303', brand: 'Tesla', model: 'Model S Plaid', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 5, rental_price: 15000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', location: 'Goa - Coastal Suite', mileage: 19000, featured: false, rating: 4.85 },
        { id: 6, owner_id: 1, vehicle_number: 'MH 01 RQ 0118', brand: 'Range Rover', model: 'Autobiography V8', vehicle_type: 'SUV', fuel_type: 'Diesel', transmission: 'Automatic', seating_capacity: 5, rental_price: 20000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800', location: 'Mumbai - Worli Hub', mileage: 28000, featured: false, rating: 4.80 },
        { id: 7, owner_id: 1, vehicle_number: 'TN 07 GT 0881', brand: 'Ford', model: 'Mustang GT Premium', vehicle_type: 'Sports Car', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 4, rental_price: 12000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800', location: 'Chennai - Guindy Hub', mileage: 22100, featured: true, rating: 4.87 },
        { id: 8, owner_id: 1, vehicle_number: 'HR 26 HY 0612', brand: 'Toyota', model: 'RAV4 Hybrid AWD', vehicle_type: 'SUV', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 6500, status: 'Available', image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800', location: 'Delhi NCR - Gurugram CyberCity', mileage: 35000, featured: false, rating: 4.75 }
      ];

      for (const v of vehiclesToInsert) {
        await models.Vehicle.findOneAndUpdate({ vehicle_number: v.vehicle_number }, v, { upsert: true, new: true });
      }

      console.log('✅ MongoDB initial dataset seeded successfully (clean operational accounts & fleet vehicles).');
    }
  } catch (seedErr) {
    console.warn('⚠️ MongoDB auto-seed notice:', seedErr.message);
  }
}

// Purge unwanted dummy data from MongoDB
async function purgeDummyData() {
  if (!isConnected || !models.User) return null;
  try {
    const deletedUsers = await models.User.deleteMany({ email: 'customer@gmail.com' });
    let deletedCust = 0;
    if (models.Customer) {
      const res = await models.Customer.deleteMany({
        $or: [
          { full_name: 'Sarah Jenkins' },
          { name: 'Sarah Jenkins' },
          { license_number: 'MH-02-20220098432' }
        ]
      });
      deletedCust = res.deletedCount;
    }
    let deletedBookings = 0;
    if (models.Booking) {
      const res = await models.Booking.deleteMany({
        $or: [
          { customer_email: 'customer@gmail.com' },
          { customer_name: 'Sarah Jenkins' },
          { booking_code: { $in: ['BK-2026-101', 'BK-2026-102'] } }
        ]
      });
      deletedBookings = res.deletedCount;
    }
    let deletedPayments = 0;
    if (models.Payment) {
      const res = await models.Payment.deleteMany({
        $or: [
          { customer_name: 'Sarah Jenkins' },
          { transaction_id: { $in: ['TXN-984214-APX', 'TXN-984215-APX'] } }
        ]
      });
      deletedPayments = res.deletedCount;
    }
    let deletedMaint = 0;
    if (models.Maintenance) {
      const res = await models.Maintenance.deleteMany({ mechanic_name: 'Viktor Ramos' });
      deletedMaint = res.deletedCount;
    }
    let deletedIns = 0;
    if (models.Insurance) {
      const res = await models.Insurance.deleteMany({ policy_number: 'POL-TY-9921' });
      deletedIns = res.deletedCount;
    }
    let deletedVer = 0;
    if (models.Verification) {
      const res = await models.Verification.deleteMany({
        $or: [
          { customer_name: 'Sarah Jenkins' },
          { document_type: /MH-02-20220098432/ }
        ]
      });
      deletedVer = res.deletedCount;
    }

    if (deletedUsers.deletedCount > 0 || deletedCust > 0 || deletedBookings > 0 || deletedPayments > 0 || deletedMaint > 0 || deletedIns > 0) {
      console.log(`🧹 [MongoDB Cleanup] Successfully purged unwanted dummy data: ${deletedUsers.deletedCount} user(s), ${deletedCust} customer(s), ${deletedBookings} booking(s), ${deletedPayments} payment(s), ${deletedMaint} maintenance record(s), ${deletedIns} insurance policy.`);
    }

    return {
      users: deletedUsers.deletedCount,
      customers: deletedCust,
      bookings: deletedBookings,
      payments: deletedPayments,
      maintenance: deletedMaint,
      insurance: deletedIns,
      verifications: deletedVer
    };
  } catch (err) {
    console.warn('⚠️ MongoDB purgeDummyData notice:', err.message);
    return null;
  }
}

// Check MongoDB connection status
function isMongoConnected() {
  if (mongoose && mongoose.connection) {
    return mongoose.connection.readyState === 1;
  }
  return Boolean(isConnected);
}

// Connect to MongoDB with URI fallback support
async function connectMongo() {
  if (!mongoose) {
    console.info('ℹ️  MongoDB module: "mongoose" is defined in package.json. Run "npm install" to enable live MongoDB driver.');
    return false;
  }

  // Return true if already connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  // Candidate connection URIs (try configured first, then alternative loopback)
  const uriCandidates = [MONGODB_URI];
  if (MONGODB_URI.includes('127.0.0.1')) {
    uriCandidates.push(MONGODB_URI.replace('127.0.0.1', 'localhost'));
  } else if (MONGODB_URI.includes('localhost')) {
    uriCandidates.push(MONGODB_URI.replace('localhost', '127.0.0.1'));
  }

  for (const uri of uriCandidates) {
    try {
      console.log(`🍃 Attempting MongoDB connection to: ${uri.replace(/\/\/.*@/, '//***@')}`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        autoIndex: true
      });

      isConnected = true;
      Object.assign(models, initModels(mongoose));

      console.log(`✅ [MongoDB] Connected successfully to database: "${conn.connection.name}" at ${uri.replace(/\/\/.*@/, '//***@')}`);

      // Auto-seed if database is fresh
      await autoSeedIfEmpty();

      // Clean previewed dummy data
      await purgeDummyData();

      return true;
    } catch (err) {
      console.warn(`⚠️ [MongoDB] Connection attempt failed on ${uri}: ${err.message}`);
    }
  }

  isConnected = false;
  console.warn(`⚠️  MongoDB service is currently unreachable on 27017.`);
  console.info(`💡 Tip: Ensure MongoDB service is running (Run "mongod" or start the Windows MongoDB service).`);
  return false;
}

// Helper to ensure MongoDB is connected before running query
async function ensureMongoConnected() {
  if (isMongoConnected()) return true;
  return await connectMongo();
}

// Bind connection events
if (mongoose && mongoose.connection) {
  mongoose.connection.on('connected', () => {
    isConnected = true;
  });
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️ MongoDB connection event: DISCONNECTED');
  });
  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.warn('⚠️ MongoDB connection error:', err.message);
  });
}

// Auto-run connection on module load
connectMongo().catch(() => {});

module.exports = {
  mongoose,
  connectMongo,
  ensureMongoConnected,
  isMongoConnected,
  getModels: () => models,
  models,
  autoSeedIfEmpty,
  purgeDummyData
};
