const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/', authenticate, authorizeRoles('admin', 'insurance', 'manager'), insuranceController.getInsurance);
router.post('/', authenticate, authorizeRoles('admin', 'insurance'), insuranceController.createInsurance);
router.put('/:id', authenticate, authorizeRoles('admin', 'insurance'), insuranceController.updateInsurance);

module.exports = router;
