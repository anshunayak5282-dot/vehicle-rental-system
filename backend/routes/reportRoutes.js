const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/bookings', authenticate, authorizeRoles('admin', 'manager'), reportController.getBookingReports);
router.get('/revenue', authenticate, authorizeRoles('admin', 'accountant'), reportController.getRevenueReports);
router.get('/vehicles', authenticate, authorizeRoles('admin', 'manager'), reportController.getVehicleReports);
router.get('/maintenance', authenticate, authorizeRoles('admin', 'mechanic'), reportController.getMaintenanceReports);

module.exports = router;
