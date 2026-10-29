const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/payments
async function getPayments(req, res, next) {
  try {
    const { status, booking_id } = req.query;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Payment) {
      const filter = {};
      if (status) filter.status = new RegExp(`^${status.trim()}$`, 'i');
      if (booking_id) filter.booking_id = booking_id;

      const docs = await models.Payment.find(filter).sort({ id: -1, _id: -1 }).lean();
      const payments = docs.map(p => ({ ...p, id: p.id || p._id.toString() }));
      return res.json({ success: true, count: payments.length, payments });
    }

    // 2. MySQL
    if (isDbConnected()) {
      let sql = `
        SELECT p.*, b.status AS booking_status, u.name AS customer_name, u.email AS customer_email
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN users u ON p.customer_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) { sql += ' AND p.status = ?'; params.push(status); }
      if (booking_id) { sql += ' AND p.booking_id = ?'; params.push(booking_id); }
      sql += ' ORDER BY p.id DESC';

      const rows = await query(sql, params);
      return res.json({ success: true, count: rows.length, payments: rows });
    }

    // 3. Fallback
    let list = [...mockStore.payments];
    if (status) list = list.filter(p => p.status.toLowerCase() === status.toLowerCase());
    if (booking_id) list = list.filter(p => p.booking_id === parseInt(booking_id));
    return res.json({ success: true, count: list.length, payments: list });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/:id
async function getPaymentById(req, res, next) {
  try {
    const { id } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.Payment) {
      let payment = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        payment = await models.Payment.findById(id).lean();
      }
      if (!payment && !isNaN(id)) {
        payment = await models.Payment.findOne({ id: parseInt(id) }).lean();
      }
      if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
      return res.json({ success: true, payment: { ...payment, id: payment.id || payment._id.toString() } });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query('SELECT * FROM payments WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payment record not found' });
      return res.json({ success: true, payment: rows[0] });
    }

    // 3. Fallback
    const p = mockStore.payments.find(item => item.id === parseInt(id));
    if (!p) return res.status(404).json({ success: false, message: 'Payment record not found' });
    return res.json({ success: true, payment: p });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments
async function createPayment(req, res, next) {
  try {
    const { booking_id, amount, payment_method = 'Credit Card' } = req.body;
    const customer_id = req.user ? req.user.id : 2;

    if (!booking_id || !amount) {
      return res.status(400).json({ success: false, message: 'Booking ID and amount are required' });
    }

    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}-APX`;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Payment) {
      const count = await models.Payment.countDocuments();
      const newId = count + 1;

      const newPayment = new models.Payment({
        id: newId,
        booking_id,
        customer_id,
        customer_name: req.user ? req.user.name : 'Sarah Jenkins',
        amount: parseFloat(amount),
        payment_method,
        transaction_id: txnId,
        status: 'Paid',
        paid_at: new Date()
      });

      await newPayment.save();

      // Update matching booking if exists
      if (models.Booking) {
        if (String(booking_id).match(/^[0-9a-fA-F]{24}$/)) {
          await models.Booking.findByIdAndUpdate(booking_id, { status: 'Confirmed', payment_status: 'Paid' });
        } else if (!isNaN(booking_id)) {
          await models.Booking.findOneAndUpdate({ id: parseInt(booking_id) }, { status: 'Confirmed', payment_status: 'Paid' });
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Payment processed successfully in MongoDB',
        paymentId: newId,
        transaction_id: txnId,
        payment: { ...newPayment.toObject(), id: newId }
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const result = await query(
        `INSERT INTO payments (booking_id, customer_id, amount, payment_method, transaction_id, status, paid_at)
         VALUES (?, ?, ?, ?, ?, 'Paid', NOW())`,
        [booking_id, customer_id, amount, payment_method, txnId]
      );

      await query('UPDATE bookings SET status = "Confirmed" WHERE id = ?', [booking_id]);
      await query('UPDATE invoices SET status = "Paid" WHERE booking_id = ?', [booking_id]);

      return res.status(201).json({
        success: true,
        message: 'Payment processed successfully',
        paymentId: result.insertId,
        transaction_id: txnId
      });
    }

    // 3. Fallback
    const newPayment = {
      id: mockStore.payments.length + 1,
      booking_id: parseInt(booking_id),
      customer_id,
      customer_name: req.user ? req.user.name : 'Sarah Jenkins',
      amount: parseFloat(amount),
      payment_method,
      transaction_id: txnId,
      status: 'Paid',
      paid_at: new Date().toISOString()
    };
    mockStore.payments.unshift(newPayment);

    const booking = mockStore.bookings.find(b => b.id === parseInt(booking_id));
    if (booking) {
      booking.status = 'Confirmed';
      booking.payment_status = 'Paid';
    }

    const invoice = mockStore.invoices.find(inv => inv.booking_id === parseInt(booking_id));
    if (invoice) {
      invoice.status = 'Paid';
    }

    return res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      payment: newPayment
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/payments/:id/verify
async function verifyPayment(req, res, next) {
  try {
    const { id } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.Payment) {
      let p = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        p = await models.Payment.findByIdAndUpdate(id, { status: 'Paid' }, { new: true });
      }
      if (!p && !isNaN(id)) {
        p = await models.Payment.findOneAndUpdate({ id: parseInt(id) }, { status: 'Paid' }, { new: true });
      }
      return res.json({ success: true, message: 'Payment verified successfully in MongoDB', payment: p });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('UPDATE payments SET status = "Paid" WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Payment verified successfully.' });
    }

    // 3. Fallback
    const p = mockStore.payments.find(item => item.id === parseInt(id));
    if (!p) return res.status(404).json({ success: false, message: 'Payment not found' });
    p.status = 'Paid';
    return res.json({ success: true, message: 'Payment verified successfully.', payment: p });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/:id/refund
async function refundPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, refund_amount } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Payment) {
      let p = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        p = await models.Payment.findByIdAndUpdate(id, { status: 'Refunded' }, { new: true });
      }
      if (!p && !isNaN(id)) {
        p = await models.Payment.findOneAndUpdate({ id: parseInt(id) }, { status: 'Refunded' }, { new: true });
      }
      return res.json({ success: true, message: 'Refund issued successfully in MongoDB', payment: p });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('UPDATE payments SET status = "Refunded" WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Refund issued successfully.' });
    }

    // 3. Fallback
    const p = mockStore.payments.find(item => item.id === parseInt(id));
    if (!p) return res.status(404).json({ success: false, message: 'Payment not found' });
    p.status = 'Refunded';
    p.refund_reason = reason || 'Customer request';
    return res.json({ success: true, message: 'Refund issued successfully.', payment: p });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/invoice/:bookingId
async function getInvoice(req, res, next) {
  try {
    const { bookingId } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.Booking) {
      let b = null;
      if (String(bookingId).match(/^[0-9a-fA-F]{24}$/)) {
        b = await models.Booking.findById(bookingId).lean();
      }
      if (!b && !isNaN(bookingId)) {
        b = await models.Booking.findOne({ id: parseInt(bookingId) }).lean();
      }
      if (b) {
        const subtotal = Math.round(b.total_amount / 1.1);
        const tax = b.total_amount - subtotal;
        return res.json({
          success: true,
          invoice: {
            id: b.id || 1,
            booking_id: b.id || b._id.toString(),
            invoice_number: `INV-2026-${String(b.id || 1).padStart(4, '0')}`,
            subtotal,
            tax_amount: tax,
            final_amount: b.total_amount,
            status: b.payment_status === 'Paid' ? 'Paid' : 'Unpaid',
            issued_at: new Date().toISOString()
          }
        });
      }
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
      return res.json({ success: true, invoice: rows[0] });
    }

    // 3. Fallback
    const inv = mockStore.invoices.find(item => item.booking_id === parseInt(bookingId));
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.json({ success: true, invoice: inv });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  verifyPayment,
  refundPayment,
  getInvoice
};
