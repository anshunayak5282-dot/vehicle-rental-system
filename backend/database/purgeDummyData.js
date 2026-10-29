/**
 * STANDALONE MONGODB DUMMY DATA PURGE SCRIPT
 * Usage: node backend/database/purgeDummyData.js
 * Safely removes dummy placeholder records (Sarah Jenkins customer account, sample bookings, payments, maintenance logs, and test insurance)
 * while strictly preserving all valid staff accounts (admin, manager, driver) and the 8 fleet vehicles.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  console.error('❌ Mongoose is not installed in node_modules.');
  process.exit(1);
}

const initModels = require('../models');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_rental';

async function runPurge() {
  const uriCandidates = [MONGODB_URI];
  if (MONGODB_URI.includes('127.0.0.1')) uriCandidates.push(MONGODB_URI.replace('127.0.0.1', 'localhost'));
  else if (MONGODB_URI.includes('localhost')) uriCandidates.push(MONGODB_URI.replace('localhost', '127.0.0.1'));

  let connected = false;
  for (const uri of uriCandidates) {
    try {
      console.log('🍃 Connecting to MongoDB at:', uri.replace(/\/\/.*@/, '//***@'));
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000, autoIndex: true });
      console.log('✅ Connected to MongoDB.');
      connected = true;
      break;
    } catch (err) {
      console.warn(`⚠️ Connection failed on ${uri}:`, err.message);
    }
  }

  if (!connected) {
    console.error('❌ Could not connect to MongoDB on port 27017. Ensure mongod is running.');
    process.exit(1);
  }

  try {
    const models = initModels(mongoose);

    console.log('🧹 Purging unwanted dummy data...');
    const userRes = await models.User.deleteMany({ email: 'customer@gmail.com' });
    let custCount = 0;
    if (models.Customer) {
      const res = await models.Customer.deleteMany({
        $or: [{ full_name: 'Sarah Jenkins' }, { name: 'Sarah Jenkins' }, { license_number: 'MH-02-20220098432' }]
      });
      custCount = res.deletedCount;
    }
    let bookCount = 0;
    if (models.Booking) {
      const res = await models.Booking.deleteMany({
        $or: [
          { customer_email: 'customer@gmail.com' },
          { customer_name: 'Sarah Jenkins' },
          { booking_code: { $in: ['BK-2026-101', 'BK-2026-102'] } }
        ]
      });
      bookCount = res.deletedCount;
    }
    let payCount = 0;
    if (models.Payment) {
      const res = await models.Payment.deleteMany({
        $or: [
          { customer_name: 'Sarah Jenkins' },
          { transaction_id: { $in: ['TXN-984214-APX', 'TXN-984215-APX'] } }
        ]
      });
      payCount = res.deletedCount;
    }
    let maintCount = 0;
    if (models.Maintenance) {
      const res = await models.Maintenance.deleteMany({ mechanic_name: 'Viktor Ramos' });
      maintCount = res.deletedCount;
    }
    let insCount = 0;
    if (models.Insurance) {
      const res = await models.Insurance.deleteMany({ policy_number: 'POL-TY-9921' });
      insCount = res.deletedCount;
    }
    let verCount = 0;
    if (models.Verification) {
      const res = await models.Verification.deleteMany({
        $or: [{ customer_name: 'Sarah Jenkins' }, { document_type: /MH-02-20220098432/ }]
      });
      verCount = res.deletedCount;
    }

    console.log('=======================================================');
    console.log('🎉 Cleanup Summary:');
    console.log(` - Users purged:        ${userRes.deletedCount}`);
    console.log(` - Customers purged:    ${custCount}`);
    console.log(` - Bookings purged:     ${bookCount}`);
    console.log(` - Payments purged:     ${payCount}`);
    console.log(` - Maintenance purged:  ${maintCount}`);
    console.log(` - Insurance purged:    ${insCount}`);
    console.log(` - Verification purged: ${verCount}`);
    console.log('✅ MongoDB database is now clean! Valid staff accounts & fleet vehicles remain intact.');
    console.log('=======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Purge Error:', err.message);
    process.exit(1);
  }
}

runPurge();
