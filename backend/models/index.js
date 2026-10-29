// Barrel export for all MongoDB / Mongoose models with separate role collections
const createUserModel = require('./User');
const createCustomerModel = require('./Customer');
const createAdminModel = require('./Admin');
const createManagerModel = require('./Manager');
const createDriverModel = require('./Driver');
const createVehicleModel = require('./Vehicle');
const createBookingModel = require('./Booking');
const createPaymentModel = require('./Payment');
const createMaintenanceModel = require('./Maintenance');
const createInsuranceModel = require('./Insurance');
const createVerificationModel = require('./Verification');

function initModels(mongoose) {
  if (!mongoose) return {};

  return {
    User: createUserModel(mongoose),
    Customer: createCustomerModel(mongoose),
    Admin: createAdminModel(mongoose),
    Manager: createManagerModel(mongoose),
    Driver: createDriverModel(mongoose),
    Vehicle: createVehicleModel(mongoose),
    Booking: createBookingModel(mongoose),
    Payment: createPaymentModel(mongoose),
    Maintenance: createMaintenanceModel(mongoose),
    Insurance: createInsuranceModel(mongoose),
    Verification: createVerificationModel(mongoose)
  };
}

module.exports = initModels;
