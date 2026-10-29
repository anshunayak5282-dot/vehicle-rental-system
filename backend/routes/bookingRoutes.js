const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/', authenticate, bookingController.getBookings);
router.get('/:id', authenticate, bookingController.getBookingById);
router.post('/', authenticate, bookingController.createBooking);
router.put('/:id', authenticate, bookingController.updateBooking);
router.put('/:id/approve', authenticate, authorizeRoles('admin', 'manager', 'receptionist'), bookingController.approveBooking);
router.put('/:id/reject', authenticate, authorizeRoles('admin', 'manager'), bookingController.rejectBooking);
router.put('/:id/cancel', authenticate, bookingController.cancelBooking);
router.delete('/:id', authenticate, authorizeRoles('admin'), bookingController.deleteBooking);

module.exports = router;
