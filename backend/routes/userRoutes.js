const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/', authenticate, authorizeRoles('admin', 'manager', 'receptionist'), userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.post('/', authenticate, authorizeRoles('admin', 'receptionist'), userController.createUser);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, authorizeRoles('admin'), userController.deleteUser);

module.exports = router;
