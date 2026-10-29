const bcrypt = require('bcrypt');
const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const mockStore = require('../services/mockDataStore');
const { ROLE_IDS } = require('./authController');

// GET /api/users
async function getAllUsers(req, res, next) {
  try {
    const { role, status } = req.query;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.User) {
      const filter = {};
      if (role && role !== 'all') filter.role = role.toLowerCase();
      if (status && status !== 'all') filter.status = status.toLowerCase();

      const docs = await models.User.find(filter).select('-password').sort({ id: -1, _id: -1 }).lean();
      const users = docs.map(u => {
        const displayName = u.full_name || u.name || (u.email ? u.email.split('@')[0] : 'User');
        return {
          ...u,
          id: u.id || u._id.toString(),
          _id: u._id ? u._id.toString() : undefined,
          full_name: displayName,
          name: displayName
        };
      });
      return res.json({ success: true, count: users.length, users });
    }

    // 2. MySQL
    if (isDbConnected()) {
      let sql = `
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, r.name AS role, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params = [];

      if (role && role !== 'all') {
        sql += ' AND r.name = ?';
        params.push(role);
      }
      if (status && status !== 'all') {
        sql += ' AND u.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY u.id DESC';
      const rows = await query(sql, params);
      const users = rows.map(r => ({ ...r, full_name: r.name }));
      return res.json({ success: true, count: users.length, users });
    }

    // 3. Fallback
    let filtered = [...mockStore.users];
    if (role && role !== 'all') filtered = filtered.filter(u => u.role === role);
    if (status && status !== 'all') filtered = filtered.filter(u => u.status === status);

    const safeUsers = filtered.map(({ password, ...rest }) => ({
      ...rest,
      full_name: rest.full_name || rest.name
    }));
    return res.json({ success: true, count: safeUsers.length, users: safeUsers });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.User) {
      let user = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        user = await models.User.findById(id).select('-password').lean();
      }
      if (!user && !isNaN(id)) {
        user = await models.User.findOne({ id: parseInt(id) }).select('-password').lean();
      }
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const displayName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'User');
      let roleProfile = null;
      if (user.role === 'customer' && models.Customer) {
        roleProfile = await models.Customer.findOne({ user_id: user._id }).lean();
      }
      return res.json({
        success: true,
        user: {
          ...user,
          id: user.id || user._id.toString(),
          _id: user._id ? user._id.toString() : undefined,
          full_name: displayName,
          name: displayName,
          avatar_url: user.avatar_url || (roleProfile ? roleProfile.avatar_url : '') || '',
          city: user.city || (roleProfile ? roleProfile.city : '') || '',
          postal_code: user.postal_code || (roleProfile ? roleProfile.postal_code : '') || '',
          address: user.address || (roleProfile ? roleProfile.address : '') || '',
          license_number: (roleProfile ? roleProfile.license_number : user.license_number) || '',
          profile: roleProfile || null
        }
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const rows = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, r.name AS role, u.created_at
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, user: { ...rows[0], full_name: rows[0].name } });
    }

    // 3. Fallback
    const user = mockStore.users.find(u => u.id === parseInt(id));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...safe } = user;
    return res.json({ success: true, user: { ...safe, full_name: safe.full_name || safe.name } });
  } catch (err) {
    next(err);
  }
}

// POST /api/users (Admin creates a user)
async function createUser(req, res, next) {
  try {
    const { name, full_name, email, password, phone, role = 'customer', status = 'active' } = req.body;
    const resolvedFullName = (full_name || name || '').trim();
    if (!resolvedFullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const roleId = ROLE_IDS[role.toLowerCase()] || 2;
    const cleanEmail = email.trim().toLowerCase();

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.User) {
      const existing = await models.User.findOne({ email: cleanEmail });
      if (existing) return res.status(409).json({ success: false, message: 'Email already exists' });

      const hash = await bcrypt.hash(password, 10);
      const count = await models.User.countDocuments();
      const newId = count + 1;
      const normalizedRole = role.toLowerCase();

      const cleanCity = req.body.city ? req.body.city.trim() : null;
      const cleanZip = (req.body.postal_code || req.body.zip) ? (req.body.postal_code || req.body.zip).trim() : null;
      const cleanAddress = req.body.address ? req.body.address.trim() : null;
      const cleanAvatar = req.body.avatar_url ? req.body.avatar_url.trim() : null;
      const cleanLicense = req.body.license_number ? req.body.license_number.trim().toUpperCase() : null;

      const userDoc = new models.User({
        id: newId,
        full_name: resolvedFullName,
        name: resolvedFullName,
        email: cleanEmail,
        password: hash,
        phone: phone ? phone.trim() : null,
        role: normalizedRole,
        role_id: roleId,
        status: status || 'active',
        license_number: cleanLicense,
        city: cleanCity,
        postal_code: cleanZip,
        address: cleanAddress,
        avatar_url: cleanAvatar,
        verification_status: 'verified'
      });

      // Role profile creation in dedicated role collection with user_id, full_name, name, and role
      let roleProfileDoc = null;
      if (normalizedRole === 'customer' && models.Customer) {
        roleProfileDoc = new models.Customer({
          user_id: userDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'customer',
          license_number: cleanLicense,
          license_expiry: '2029-12-31',
          id_proof_type: 'Driving License',
          verification_status: 'verified',
          address: cleanAddress,
          city: cleanCity,
          postal_code: cleanZip,
          avatar_url: cleanAvatar,
          membership_tier: 'Standard',
          total_rentals: 0
        });
        await roleProfileDoc.save();
        userDoc.role_profile_id = roleProfileDoc._id;
      } else if (normalizedRole === 'driver' && models.Driver) {
        roleProfileDoc = new models.Driver({
          user_id: userDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'driver',
          license_number: req.body.license_number || `COM-MH-${newId}000`,
          experience_years: 5,
          availability_status: 'available',
          rating: 5.0,
          total_trips: 0
        });
        await roleProfileDoc.save();
        userDoc.role_profile_id = roleProfileDoc._id;
      } else if (normalizedRole === 'manager' && models.Manager) {
        roleProfileDoc = new models.Manager({
          user_id: userDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'manager',
          hub_assigned: req.body.hub_assigned || 'Mumbai - BKC Hub',
          shift: 'Morning',
          active_dispatches: 0
        });
        await roleProfileDoc.save();
        userDoc.role_profile_id = roleProfileDoc._id;
      } else if (normalizedRole === 'admin' && models.Admin) {
        roleProfileDoc = new models.Admin({
          user_id: userDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'admin',
          admin_level: req.body.admin_level || 'Operations Admin',
          department: req.body.department || 'Fleet Operations',
          permissions: ['manage_fleet', 'manage_users', 'view_reports']
        });
        await roleProfileDoc.save();
        userDoc.role_profile_id = roleProfileDoc._id;
      }

      await userDoc.save();
      const { password: _, ...safe } = userDoc.toObject();
      return res.status(201).json({
        success: true,
        message: 'User created successfully in MongoDB',
        userId: newId,
        user: {
          ...safe,
          id: safe.id || safe._id.toString(),
          full_name: resolvedFullName,
          name: resolvedFullName,
          profile: roleProfileDoc ? roleProfileDoc.toObject() : null
        }
      });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const existing = await query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) return res.status(409).json({ success: false, message: 'Email already exists' });

      const hash = await bcrypt.hash(password, 10);
      const result = await query(
        'INSERT INTO users (name, email, password, phone, role_id, status) VALUES (?, ?, ?, ?, ?, ?)',
        [resolvedFullName, cleanEmail, hash, phone || null, roleId, status]
      );

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        userId: result.insertId
      });
    }

    // 3. Fallback
    const newId = mockStore.users.length + 1;
    const newUser = {
      id: newId,
      name: resolvedFullName,
      full_name: resolvedFullName,
      email: cleanEmail,
      password,
      phone: phone || '+91 98201 01999',
      role_id: roleId,
      role: role.toLowerCase(),
      status,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      created_at: new Date().toISOString()
    };
    mockStore.users.push(newUser);
    const { password: _, ...safe } = newUser;
    return res.status(201).json({ success: true, message: 'User created successfully', user: safe });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/:id
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name, full_name, email, phone, role, status,
      avatar_url, city, postal_code, zip, address, license_number
    } = req.body;

    // 1. MongoDB
    if (isMongoConnected() && models.User) {
      const updates = {};
      const newName = (full_name !== undefined || name !== undefined) ? (full_name || name || '').trim() : '';
      if (newName) {
        updates.name = newName;
        updates.full_name = newName;
      }
      if (email !== undefined) updates.email = email.trim().toLowerCase();
      if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
      if (status !== undefined) updates.status = status;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (city !== undefined) updates.city = city ? city.trim() : null;
      const cleanZip = (postal_code !== undefined ? postal_code : zip);
      if (cleanZip !== undefined) updates.postal_code = cleanZip ? cleanZip.trim() : null;
      if (address !== undefined) updates.address = address ? address.trim() : null;
      if (license_number !== undefined) updates.license_number = license_number ? license_number.trim().toUpperCase() : null;
      if (role) {
        updates.role = role.toLowerCase();
        updates.role_id = ROLE_IDS[role.toLowerCase()] || 2;
      }

      let updated = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        updated = await models.User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
      }
      if (!updated && !isNaN(id)) {
        updated = await models.User.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true }).select('-password');
      }
      if (!updated) return res.status(404).json({ success: false, message: 'User not found' });

      // Synchronize role-specific profile document (e.g. Customer)
      const roleUpdates = {};
      if (newName) {
        roleUpdates.name = newName;
        roleUpdates.full_name = newName;
      }
      if (avatar_url !== undefined) roleUpdates.avatar_url = avatar_url;
      if (city !== undefined) roleUpdates.city = city ? city.trim() : null;
      if (cleanZip !== undefined) roleUpdates.postal_code = cleanZip ? cleanZip.trim() : null;
      if (address !== undefined) roleUpdates.address = address ? address.trim() : null;
      if (license_number !== undefined) roleUpdates.license_number = license_number ? license_number.trim().toUpperCase() : null;

      if (Object.keys(roleUpdates).length > 0) {
        if (models.Customer) await models.Customer.updateMany({ user_id: updated._id }, roleUpdates);
        if (models.Driver) await models.Driver.updateMany({ user_id: updated._id }, roleUpdates);
        if (models.Manager) await models.Manager.updateMany({ user_id: updated._id }, roleUpdates);
        if (models.Admin) await models.Admin.updateMany({ user_id: updated._id }, roleUpdates);
      }

      let roleProfile = null;
      if (updated.role === 'customer' && models.Customer) {
        roleProfile = await models.Customer.findOne({ user_id: updated._id }).lean();
      }

      const returnUser = {
        ...updated.toObject(),
        id: updated.id || updated._id.toString(),
        _id: updated._id.toString(),
        full_name: updated.full_name || updated.name,
        name: updated.full_name || updated.name,
        avatar_url: updated.avatar_url || (roleProfile ? roleProfile.avatar_url : '') || '',
        city: updated.city || (roleProfile ? roleProfile.city : '') || '',
        postal_code: updated.postal_code || (roleProfile ? roleProfile.postal_code : '') || '',
        address: updated.address || (roleProfile ? roleProfile.address : '') || '',
        license_number: (roleProfile ? roleProfile.license_number : updated.license_number) || '',
        profile: roleProfile || null
      };

      return res.json({ success: true, message: 'User updated successfully in MongoDB', user: returnUser });
    }

    // 2. MySQL
    if (isDbConnected()) {
      const updates = [];
      const params = [];

      if (name) { updates.push('name = ?'); params.push(name.trim()); }
      if (email) { updates.push('email = ?'); params.push(email.trim().toLowerCase()); }
      if (phone) { updates.push('phone = ?'); params.push(phone.trim()); }
      if (status) { updates.push('status = ?'); params.push(status); }
      if (role && ROLE_IDS[role.toLowerCase()]) { updates.push('role_id = ?'); params.push(ROLE_IDS[role.toLowerCase()]); }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields provided to update.' });
      }

      params.push(id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      return res.json({ success: true, message: 'User updated successfully' });
    }

    // 3. Fallback
    const user = mockStore.users.find(u => u.id === parseInt(id));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (status) user.status = status;
    if (role) {
      user.role = role.toLowerCase();
      user.role_id = ROLE_IDS[role.toLowerCase()] || user.role_id;
    }
    return res.json({ success: true, message: 'User updated successfully', user });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // 1. MongoDB
    if (isMongoConnected() && models.User) {
      let deleted = null;
      if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
        deleted = await models.User.findByIdAndDelete(id);
      }
      if (!deleted && !isNaN(id)) {
        deleted = await models.User.findOneAndDelete({ id: parseInt(id) });
      }
      if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });

      // Clean up role profile from role collections
      if (models.Customer) await models.Customer.deleteMany({ user_id: deleted._id });
      if (models.Driver) await models.Driver.deleteMany({ user_id: deleted._id });
      if (models.Manager) await models.Manager.deleteMany({ user_id: deleted._id });
      if (models.Admin) await models.Admin.deleteMany({ user_id: deleted._id });

      return res.json({ success: true, message: 'User and role profile removed successfully from MongoDB' });
    }

    // 2. MySQL
    if (isDbConnected()) {
      await query('DELETE FROM users WHERE id = ?', [id]);
      return res.json({ success: true, message: 'User removed successfully' });
    }

    // 3. Fallback
    const index = mockStore.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return res.status(404).json({ success: false, message: 'User not found' });
    mockStore.users.splice(index, 1);
    return res.json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
