const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');

// GET /api/verification
async function getVerifications(req, res, next) {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Verification) {
      const docs = await models.Verification.find({}).sort({ id: -1, _id: -1 }).lean();
      const verifications = docs.map(v => ({ ...v, id: v.id || v._id.toString() }));
      return res.json({ success: true, count: verifications.length, verifications });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query(`
        SELECT v.*, u.name AS verifier_name
        FROM verification v
        JOIN users u ON v.verified_by = u.id
        ORDER BY v.id DESC
      `);
      return res.json({ success: true, count: rows.length, verifications: rows });
    }

    // 3. Fallback
    return res.json({ success: true, count: mockStore.verificationRecords.length, verifications: mockStore.verificationRecords });
  } catch (err) {
    next(err);
  }
}

// POST /api/verification
async function createVerification(req, res, next) {
  try {
    const { target_type, target_id, document_type, status = 'Approved', comments } = req.body;
    const verified_by = req.user ? req.user.id : 1;

    if (!target_type || !target_id) {
      return res.status(400).json({ success: false, message: 'Target type and target ID are required' });
    }

    // 1. MongoDB
    if (isMongoConnected() && models.Verification) {
      const count = await models.Verification.countDocuments();
      const newId = count + 1;

      const newRec = new models.Verification({
        id: newId,
        target_type,
        target_id,
        customer_name: target_type === 'customer_doc' ? (req.user ? req.user.name : 'Customer') : undefined,
        vehicle_name: target_type === 'vehicle_doc' ? 'Fleet Vehicle' : undefined,
        document_type: document_type || 'Identity Clearance',
        verifier_name: req.user ? req.user.name : 'Operations & KYC Desk',
        status,
        comments: comments || 'Verified in compliance with fleet safety standards.',
        verified_at: new Date()
      });

      await newRec.save();

      // If customer document, update customer verification status in User model
      if (target_type === 'customer_doc' && models.User) {
        const cStatus = status === 'Approved' ? 'verified' : 'rejected';
        if (String(target_id).match(/^[0-9a-fA-F]{24}$/)) {
          await models.User.findByIdAndUpdate(target_id, { verification_status: cStatus });
        } else if (!isNaN(target_id)) {
          await models.User.findOneAndUpdate({ id: parseInt(target_id) }, { verification_status: cStatus });
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Verification record submitted in MongoDB',
        id: newId,
        record: { ...newRec.toObject(), id: newId }
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const result = await query(
        `INSERT INTO verification (target_type, target_id, verified_by, document_type, status, comments)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [target_type, target_id, verified_by, document_type || 'Identity & License', status, comments || '']
      );

      if (target_type === 'customer_doc') {
        const cStatus = status === 'Approved' ? 'verified' : 'rejected';
        await query('UPDATE customers SET verification_status = ? WHERE user_id = ?', [cStatus, target_id]);
      }

      return res.status(201).json({ success: true, message: 'Verification record submitted', id: result.insertId });
    }

    // 3. Fallback
    const newRec = {
      id: mockStore.verificationRecords.length + 1,
      target_type,
      target_id: parseInt(target_id),
      customer_name: target_type === 'customer_doc' ? 'Sarah Jenkins' : undefined,
      vehicle_name: target_type === 'vehicle_doc' ? 'Fleet Vehicle' : undefined,
      document_type: document_type || 'Identity Clearance',
      verified_by,
      verifier_name: req.user ? req.user.name : 'Operations & KYC Desk',
      status,
      comments: comments || 'Verified in compliance with fleet safety standards.',
      verified_at: new Date().toISOString()
    };

    mockStore.verificationRecords.unshift(newRec);

    if (target_type === 'customer_doc') {
      const u = mockStore.users.find(item => item.id === parseInt(target_id));
      if (u) u.verification_status = status === 'Approved' ? 'verified' : 'rejected';
    }

    return res.status(201).json({ success: true, message: 'Verification recorded successfully', record: newRec });
  } catch (err) {
    next(err);
  }
}

// PUT /api/verification/:id
async function updateVerification(req, res, next) {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.Verification) {
      const updates = {};
      if (status) updates.status = status;
      if (comments) updates.comments = comments;

      let rec = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        rec = await models.Verification.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!rec && !isNaN(id)) {
        rec = await models.Verification.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
      }
      return res.json({ success: true, message: 'Verification status updated in MongoDB', record: rec });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('UPDATE verification SET status = ?, comments = ? WHERE id = ?', [status, comments || '', id]);
      return res.json({ success: true, message: 'Verification status updated' });
    }

    // 3. Fallback
    const rec = mockStore.verificationRecords.find(item => item.id === parseInt(id));
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });
    if (status) rec.status = status;
    if (comments) rec.comments = comments;
    return res.json({ success: true, message: 'Verification status updated', record: rec });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVerifications,
  createVerification,
  updateVerification
};
