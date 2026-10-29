const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/', authenticate, authorizeRoles('admin', 'verification', 'manager', 'receptionist'), verificationController.getVerifications);
router.post('/', authenticate, authorizeRoles('admin', 'verification', 'receptionist'), verificationController.createVerification);
router.put('/:id', authenticate, authorizeRoles('admin', 'verification'), verificationController.updateVerification);

module.exports = router;
