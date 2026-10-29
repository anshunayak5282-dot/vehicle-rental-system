const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/', authenticate, authorizeRoles('admin', 'mechanic', 'manager'), maintenanceController.getMaintenance);
router.post('/', authenticate, authorizeRoles('admin', 'mechanic'), maintenanceController.createMaintenance);
router.put('/:id', authenticate, authorizeRoles('admin', 'mechanic'), maintenanceController.updateMaintenance);

module.exports = router;
