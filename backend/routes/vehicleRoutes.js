const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Public routes for vehicle discovery
router.get('/', vehicleController.getVehicles);
router.get('/available', vehicleController.getAvailableVehicles);
router.get('/:id', vehicleController.getVehicleById);

// Protected routes (Admin, Owner, Rental Manager)
router.post('/', authenticate, authorizeRoles('admin', 'owner', 'manager'), vehicleController.createVehicle);
router.put('/:id', authenticate, authorizeRoles('admin', 'owner', 'manager', 'mechanic'), vehicleController.updateVehicle);
router.delete('/:id', authenticate, authorizeRoles('admin', 'owner'), vehicleController.deleteVehicle);

module.exports = router;
