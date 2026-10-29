const bcrypt = require('bcrypt');
const { query, isDbConnected } = require('../config/db');
const { isMongoConnected, ensureMongoConnected, models } = require('../config/mongodb');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, validateRequired } = require('../utils/validation');
const mockStore = require('../services/mockDataStore');

// Map role IDs to role names (4 Core Roles)
const ROLE_NAMES = {
  1: 'admin',
  2: 'customer',
  3: 'manager',
  4: 'driver'
};

const ROLE_IDS = {
  admin: 1,
  customer: 2,
  manager: 3,
  driver: 4
};

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const {
      name, full_name, email, password, phone, role = 'customer',
      license_number, address, city, postal_code, zip, avatar_url
    } = req.body;
    const resolvedFullName = (full_name || name || '').trim();

    const missing = validateRequired(req.body, ['email', 'password']);
    if (missing.length > 0 || !resolvedFullName) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${!resolvedFullName ? 'full_name, ' : ''}${missing.join(', ')}`
      });
    }

    if (resolvedFullName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be at least 2 characters long'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const validRoles = ['admin', 'customer', 'manager', 'driver'];
    const normalizedRole = validRoles.includes((role || '').toLowerCase()) ? role.toLowerCase() : 'customer';
    const roleId = ROLE_IDS[normalizedRole] || 2;
    const cleanPhone = phone ? phone.trim() : null;
    const cleanLicense = license_number ? license_number.trim().toUpperCase() : null;
    const cleanCity = city ? city.trim() : null;
    const cleanZip = (postal_code || zip) ? (postal_code || zip).trim() : null;
    const cleanAddress = address ? address.trim() : null;
    const cleanAvatar = avatar_url ? avatar_url.trim() : null;

    // Ensure MongoDB is connected
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB Database
    if (isMongoConnected() && models.User) {
      const existing = await models.User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please sign in or use a different email.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const totalUsers = await models.User.countDocuments();
      const newId = totalUsers + 1;

      // Base user document in 'users' collection with genuine fields
      const newUserDoc = new models.User({
        id: newId,
        full_name: resolvedFullName,
        name: resolvedFullName,
        email: cleanEmail,
        password: hashedPassword,
        phone: cleanPhone,
        role: normalizedRole,
        role_id: roleId,
        status: 'active',
        license_number: cleanLicense,
        city: cleanCity,
        postal_code: cleanZip,
        address: cleanAddress,
        verification_status: 'verified',
        avatar_url: cleanAvatar
      });

      // Role-specific collection document containing user_id, full_name, and role
      let roleProfileDoc = null;
      if (normalizedRole === 'customer' && models.Customer) {
        roleProfileDoc = new models.Customer({
          user_id: newUserDoc._id,
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
        newUserDoc.role_profile_id = roleProfileDoc._id;
      } else if (normalizedRole === 'driver' && models.Driver) {
        roleProfileDoc = new models.Driver({
          user_id: newUserDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'driver',
          license_number: cleanLicense || `COM-MH-${newId}000`,
          experience_years: 5,
          availability_status: 'available',
          rating: 5.0,
          total_trips: 0
        });
        await roleProfileDoc.save();
        newUserDoc.role_profile_id = roleProfileDoc._id;
      } else if (normalizedRole === 'manager' && models.Manager) {
        roleProfileDoc = new models.Manager({
          user_id: newUserDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'manager',
          hub_assigned: 'Mumbai - BKC Hub',
          shift: 'Morning',
          active_dispatches: 0
        });
        await roleProfileDoc.save();
        newUserDoc.role_profile_id = roleProfileDoc._id;
      } else if (normalizedRole === 'admin' && models.Admin) {
        roleProfileDoc = new models.Admin({
          user_id: newUserDoc._id,
          user_num_id: newId,
          full_name: resolvedFullName,
          name: resolvedFullName,
          role: 'admin',
          admin_level: 'Operations Admin',
          department: 'Fleet Operations',
          permissions: ['manage_fleet', 'manage_users', 'view_reports']
        });
        await roleProfileDoc.save();
        newUserDoc.role_profile_id = roleProfileDoc._id;
      }

      await newUserDoc.save();
      console.log(`✅ [MongoDB Saved] Successfully registered User "${newUserDoc.email}" (ID: #${newId}) into collection "users" with full_name "${resolvedFullName}" and linked ${normalizedRole} profile.`);

      const token = generateToken({
        id: newId,
        _id: newUserDoc._id.toString(),
        email: cleanEmail,
        role: normalizedRole,
        name: resolvedFullName
      });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully in MongoDB database',
        database: 'MongoDB',
        storage_engine: 'MongoDB',
        token,
        user: {
          id: newId,
          _id: newUserDoc._id.toString(),
          full_name: newUserDoc.full_name,
          name: newUserDoc.name,
          email: cleanEmail,
          role: normalizedRole,
          phone: newUserDoc.phone || '',
          city: newUserDoc.city || '',
          postal_code: newUserDoc.postal_code || '',
          address: newUserDoc.address || '',
          license_number: newUserDoc.license_number || '',
          verification_status: newUserDoc.verification_status,
          avatar_url: newUserDoc.avatar_url || '',
          role_profile_id: newUserDoc.role_profile_id
        }
      });
    }

    // If DB_TYPE is configured as mongodb but MongoDB is down
    if (process.env.DB_TYPE === 'mongodb') {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is configured as primary database (DB_TYPE=mongodb) but is currently not reachable on port 27017. Please start your MongoDB service (e.g. run "mongod" or start the Windows MongoDB service).'
      });
    }

    // 2. MySQL Database
    if (isDbConnected()) {
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please sign in or use a different email.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query(
        'INSERT INTO users (name, email, password, phone, role_id, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name.trim(), cleanEmail, hashedPassword, cleanPhone, roleId, 'active']
      );

      const userId = result.insertId;

      if (normalizedRole === 'customer') {
        await query(
          'INSERT INTO customers (user_id, license_number, verification_status) VALUES (?, ?, ?)',
          [userId, cleanLicense || `DL-MH-${userId}000`, 'verified']
        );
      }

      const token = generateToken({ id: userId, email: cleanEmail, role: normalizedRole, name: name.trim() });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: normalizedRole,
          phone: cleanPhone,
          license_number: cleanLicense
        }
      });
    }

    // 3. Mock Fallback
    const existing = mockStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in or use a different email.'
      });
    }

    const newId = mockStore.users.length + 1;
    const newUser = {
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 10),
      phone: cleanPhone || '+91 98201 01999',
      role_id: roleId,
      role: normalizedRole,
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      created_at: new Date().toISOString(),
      license_number: cleanLicense || `DL-MH-${newId}000`,
      verification_status: 'verified'
    };

    mockStore.users.push(newUser);
    const token = generateToken({ id: newId, email: newUser.email, role: normalizedRole, name: newUser.name });

    return res.status(201).json({
      success: true,
      message: 'Registration successful (Simulated Mode)',
      token,
      user: {
        id: newId,
        name: newUser.name,
        email: newUser.email,
        role: normalizedRole,
        phone: newUser.phone,
        license_number: newUser.license_number,
        verification_status: newUser.verification_status
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Ensure MongoDB connection is active
    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB Database
    if (isMongoConnected() && models.User) {
      const user = await models.User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
      }

      let isMatch = false;
      if (user.password && user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password).catch(() => false);
      }
      if (!isMatch && user.password === password) {
        isMatch = true;
      }
      // Demo preset login fallback for standard staff seed credentials
      if (!isMatch && password === 'Password@123' && ['admin@apexrentals.com', 'manager@apexrentals.com', 'driver@apexrentals.com'].includes(cleanEmail)) {
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Fetch role profile from corresponding role-specific collection
      let roleProfile = null;
      if (user.role === 'customer' && models.Customer) {
        roleProfile = await models.Customer.findOne({ user_id: user._id }).lean();
      } else if (user.role === 'driver' && models.Driver) {
        roleProfile = await models.Driver.findOne({ user_id: user._id }).lean();
      } else if (user.role === 'manager' && models.Manager) {
        roleProfile = await models.Manager.findOne({ user_id: user._id }).lean();
      } else if (user.role === 'admin' && models.Admin) {
        roleProfile = await models.Admin.findOne({ user_id: user._id }).lean();
      }

      const displayName = user.full_name || user.name || (roleProfile ? (roleProfile.full_name || roleProfile.name) : '') || cleanEmail.split('@')[0];
      const token = generateToken({
        id: user.id || user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: displayName
      });

      return res.json({
        success: true,
        message: 'Login successful (MongoDB)',
        token,
        user: {
          id: user.id || user._id.toString(),
          _id: user._id.toString(),
          name: displayName,
          full_name: displayName,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          avatar_url: user.avatar_url || (roleProfile ? roleProfile.avatar_url : '') || '',
          city: user.city || (roleProfile ? roleProfile.city : '') || '',
          postal_code: user.postal_code || (roleProfile ? roleProfile.postal_code : '') || '',
          address: user.address || (roleProfile ? roleProfile.address : '') || '',
          license_number: (roleProfile ? roleProfile.license_number : user.license_number) || '',
          verification_status: (roleProfile ? roleProfile.verification_status : user.verification_status) || 'verified',
          profile: roleProfile || null
        }
      });
    }

    // 2. MySQL Database
    if (isDbConnected()) {
      const rows = await query(
        `SELECT u.id, u.name, u.email, u.password, u.phone, u.status, u.avatar_url, r.name AS role
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.email = ?`,
        [cleanEmail]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = rows[0];
      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
      }

      const isMatch = await bcrypt.compare(password, user.password).catch(() => false) || (password === user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          full_name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar_url: user.avatar_url
        }
      });
    }

    // 3. Mock Fallback
    const user = mockStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = (password === 'Password@123') || (password === user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Tip: Default demo password is Password@123' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    return res.json({
      success: true,
      message: 'Login successful (Ready)',
      token,
      user: {
        id: user.id,
        name: user.name,
        full_name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/logout
function logout(req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const userId = req.user.id;

    if (!isMongoConnected()) {
      await ensureMongoConnected();
    }

    // 1. MongoDB
    if (isMongoConnected() && models.User) {
      let user = null;
      if (String(userId).match(/^[0-9a-fA-F]{24}$/)) {
        user = await models.User.findById(userId).lean();
      }
      if (!user && !isNaN(userId)) {
        user = await models.User.findOne({ id: parseInt(userId) }).lean();
      }
      if (!user && req.user.email) {
        user = await models.User.findOne({ email: req.user.email }).lean();
      }
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      let roleProfile = null;
      if (user.role === 'customer' && models.Customer) {
        roleProfile = await models.Customer.findOne({ user_id: user._id }).lean();
      } else if (user.role === 'driver' && models.Driver) {
        roleProfile = await models.Driver.findOne({ user_id: user._id }).lean();
      } else if (user.role === 'manager' && models.Manager) {
        roleProfile = await models.Manager.findOne({ user_id: user._id }).lean();
      } else if (user.role === 'admin' && models.Admin) {
        roleProfile = await models.Admin.findOne({ user_id: user._id }).lean();
      }

      const displayName = user.full_name || user.name || (roleProfile ? (roleProfile.full_name || roleProfile.name) : '') || user.email.split('@')[0];
      const { password, ...safeUser } = user;
      return res.json({
        success: true,
        user: {
          ...safeUser,
          id: safeUser.id || safeUser._id.toString(),
          _id: safeUser._id ? safeUser._id.toString() : undefined,
          name: displayName,
          full_name: displayName,
          phone: safeUser.phone || '',
          role: safeUser.role || (roleProfile ? roleProfile.role : 'customer'),
          avatar_url: safeUser.avatar_url || (roleProfile ? roleProfile.avatar_url : '') || '',
          city: safeUser.city || (roleProfile ? roleProfile.city : '') || '',
          postal_code: safeUser.postal_code || (roleProfile ? roleProfile.postal_code : '') || '',
          address: safeUser.address || (roleProfile ? roleProfile.address : '') || '',
          license_number: (roleProfile ? roleProfile.license_number : safeUser.license_number) || '',
          verification_status: (roleProfile ? roleProfile.verification_status : safeUser.verification_status) || 'verified',
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
        [userId]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, user: { ...rows[0], full_name: rows[0].name } });
    }

    // 3. Fallback
    const user = mockStore.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...safeUser } = user;
    return res.json({ success: true, user: { ...safeUser, full_name: safeUser.name } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  ROLE_IDS,
  ROLE_NAMES
};
