const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/', authenticate, authorizeRoles('admin', 'accountant', 'manager'), paymentController.getPayments);
router.get('/:id', authenticate, paymentController.getPaymentById);
router.post('/', authenticate, paymentController.createPayment);
router.put('/:id/verify', authenticate, authorizeRoles('admin', 'accountant'), paymentController.verifyPayment);
router.post('/:id/refund', authenticate, authorizeRoles('admin', 'accountant'), paymentController.refundPayment);
router.get('/invoice/:bookingId', authenticate, paymentController.getInvoice);

module.exports = router;
