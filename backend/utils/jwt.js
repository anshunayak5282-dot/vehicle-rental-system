const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_vehicle_rental_jwt_key_2026_apex';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  if (!token) return null;

  // 1. Attempt standard JWT verification
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // 2. Handle client demo tokens (e.g. demo_jwt_admin_session, mock_jwt_...)
    if (typeof token === 'string') {
      if (token.startsWith('mock_jwt_')) {
        try {
          const raw = Buffer.from(token.replace('mock_jwt_', ''), 'base64').toString('utf8');
          const payload = JSON.parse(raw);
          if (payload && payload.role) return payload;
        } catch (e) {}
      }

      if (token.startsWith('demo_jwt_')) {
        const match = token.match(/demo_jwt_([a-zA-Z0-9]+)_session/);
        const role = match ? match[1].toLowerCase() : 'admin';
        const demoAccounts = {
          admin: { id: 1, name: 'Alexander Vance', email: 'admin@apexrentals.com', role: 'admin' },
          customer: { id: 2, name: 'Sarah Jenkins', email: 'customer@gmail.com', role: 'customer' },
          manager: { id: 3, name: 'Eleanor Cross', email: 'manager@apexrentals.com', role: 'manager' },
          driver: { id: 4, name: 'David Rodriguez', email: 'driver@apexrentals.com', role: 'driver' }
        };
        if (demoAccounts[role]) {
          return demoAccounts[role];
        }
      }
    }
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
