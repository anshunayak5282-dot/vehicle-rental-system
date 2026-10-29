/**
 * STANDALONE MONGODB SEEDER SCRIPT
 * Usage: node backend/database/mongoSeed.js
 * Populates MongoDB with separate role collections: users, admins, customers, managers, drivers,
 * vehicles with Indian Hub Locations, and sample bookings.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  console.error('❌ Mongoose is not installed. Please run "npm install mongoose" first.');
  process.exit(1);
}

const initModels = require('../models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_rental';

async function seedDatabase() {
  const uriCandidates = [MONGODB_URI];
  if (MONGODB_URI.includes('127.0.0.1')) uriCandidates.push(MONGODB_URI.replace('127.0.0.1', 'localhost'));
  else if (MONGODB_URI.includes('localhost')) uriCandidates.push(MONGODB_URI.replace('localhost', '127.0.0.1'));

  let connected = false;
  for (const uri of uriCandidates) {
    try {
      console.log('🍃 Connecting to MongoDB at:', uri.replace(/\/\/.*@/, '//***@'));
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
        autoIndex: true
      });
      console.log('✅ Connected to MongoDB at:', uri.replace(/\/\/.*@/, '//***@'));
      connected = true;
      break;
    } catch (err) {
      console.warn(`⚠️ Connection attempt failed on ${uri}:`, err.message);
    }
  }

  if (!connected) {
    console.error('❌ Could not connect to MongoDB on port 27017.');
    console.info('💡 Ensure the MongoDB service is running (e.g. run "mongod" or start the Windows MongoDB service).');
    process.exit(1);
  }

  try {
    const models = initModels(mongoose);

    console.log('🧹 Clearing existing collections...');
    await models.User.deleteMany({});
    if (models.Customer) await models.Customer.deleteMany({});
    if (models.Admin) await models.Admin.deleteMany({});
    if (models.Manager) await models.Manager.deleteMany({});
    if (models.Driver) await models.Driver.deleteMany({});
    await models.Vehicle.deleteMany({});
    await models.Booking.deleteMany({});
    await models.Payment.deleteMany({});
    await models.Maintenance.deleteMany({});
    await models.Insurance.deleteMany({});
    await models.Verification.deleteMany({});

    console.log('👥 Seeding 4 Core Role User Accounts into Separated Collections...');
    const hashedPassword = await bcrypt.hash('Password@123', 10);

    // 1. Admin
    const adminUser = await models.User.create({
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
    });
    const adminProfile = await models.Admin.create({
      user_id: adminUser._id,
      user_num_id: 1,
      full_name: 'Alexander Vance',
      name: 'Alexander Vance',
      role: 'admin',
      admin_level: 'Super Admin',
      department: 'Executive Governance'
    });
    adminUser.role_profile_id = adminProfile._id;
    await adminUser.save();

    // 2. Manager
    const managerUser = await models.User.create({
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
    });
    const managerProfile = await models.Manager.create({
      user_id: managerUser._id,
      user_num_id: 2,
      full_name: 'Eleanor Cross',
      name: 'Eleanor Cross',
      role: 'manager',
      hub_assigned: 'Mumbai - BKC Hub',
      managed_hubs: ['Mumbai - BKC Hub', 'Mumbai - Worli Hub', 'Goa - Coastal Suite']
    });
    managerUser.role_profile_id = managerProfile._id;
    await managerUser.save();

    // 3. Driver
    const driverUser = await models.User.create({
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
    });
    const driverProfile = await models.Driver.create({
      user_id: driverUser._id,
      user_num_id: 3,
      full_name: 'David Rodriguez',
      name: 'David Rodriguez',
      role: 'driver',
      license_number: 'DL-MH-COMM-7788',
      experience_years: 6,
      rating: 4.95,
      total_trips: 148
    });
    driverUser.role_profile_id = driverProfile._id;
    await driverUser.save();

    console.log('✅ Core Role Accounts successfully seeded into separate collections (users, admins, managers, drivers). Customers collection is kept clean for live user registrations.');

    console.log('🚗 Seeding Fleet Vehicles with Indian Hub Locations & INR Rates...');
    const vehicles = await models.Vehicle.insertMany([
      { id: 1, owner_id: 1, vehicle_number: 'MH 02 CZ 7701', brand: 'Porsche', model: 'Taycan 4S Electric', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 22000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800', location: 'Mumbai - BKC Hub', mileage: 8200, featured: true, rating: 4.95 },
      { id: 2, owner_id: 1, vehicle_number: 'DL 01 AB 0402', brand: 'Mercedes-Benz', model: 'S-Class 580', vehicle_type: 'Luxury Sedan', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 18000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', location: 'Delhi NCR - IGI Airport T3', mileage: 12400, featured: true, rating: 4.90 },
      { id: 3, owner_id: 1, vehicle_number: 'KA 03 MX 0908', brand: 'BMW', model: 'X7 M50i Luxury SUV', vehicle_type: 'SUV', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 7, rental_price: 16000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', location: 'Bengaluru - UB City Hub', mileage: 16500, featured: true, rating: 4.88 },
      { id: 4, owner_id: 1, vehicle_number: 'TS 09 EV 0552', brand: 'Audi', model: 'RS e-tron GT', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 24000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800', location: 'Hyderabad - HITEC City', mileage: 6400, featured: true, rating: 4.92 },
      { id: 5, owner_id: 1, vehicle_number: 'GA 07 EV 0303', brand: 'Tesla', model: 'Model S Plaid', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 5, rental_price: 15000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', location: 'Goa - Coastal Suite', mileage: 19000, featured: false, rating: 4.85 },
      { id: 6, owner_id: 1, vehicle_number: 'MH 01 RQ 0118', brand: 'Range Rover', model: 'Autobiography V8', vehicle_type: 'SUV', fuel_type: 'Diesel', transmission: 'Automatic', seating_capacity: 5, rental_price: 20000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800', location: 'Mumbai - Worli Hub', mileage: 28000, featured: false, rating: 4.80 },
      { id: 7, owner_id: 1, vehicle_number: 'TN 07 GT 0881', brand: 'Ford', model: 'Mustang GT Premium', vehicle_type: 'Sports Car', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 4, rental_price: 12000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800', location: 'Chennai - Guindy Hub', mileage: 22100, featured: true, rating: 4.87 },
      { id: 8, owner_id: 1, vehicle_number: 'HR 26 HY 0612', brand: 'Toyota', model: 'RAV4 Hybrid AWD', vehicle_type: 'SUV', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 6500, status: 'Available', image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800', location: 'Delhi NCR - Gurugram CyberCity', mileage: 35000, featured: false, rating: 4.75 }
    ]);
    console.log(`✅ ${vehicles.length} Vehicles seeded.`);

    console.log('🧹 Purging any residual dummy data from MongoDB...');
    await models.User.deleteMany({ email: 'customer@gmail.com' });
    if (models.Customer) await models.Customer.deleteMany({ $or: [{ full_name: 'Sarah Jenkins' }, { name: 'Sarah Jenkins' }] });
    if (models.Booking) await models.Booking.deleteMany({ $or: [{ customer_email: 'customer@gmail.com' }, { customer_name: 'Sarah Jenkins' }] });
    if (models.Payment) await models.Payment.deleteMany({ customer_name: 'Sarah Jenkins' });
    if (models.Maintenance) await models.Maintenance.deleteMany({ mechanic_name: 'Viktor Ramos' });
    if (models.Insurance) await models.Insurance.deleteMany({ policy_number: 'POL-TY-9921' });
    if (models.Verification) await models.Verification.deleteMany({ customer_name: 'Sarah Jenkins' });

    console.log('=======================================================');
    console.log('🎉 MongoDB Database Seed & Cleanup Completed Successfully!');
    console.log('=======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB Seed Error:', err.message);
    process.exit(1);
  }
}

seedDatabase();
