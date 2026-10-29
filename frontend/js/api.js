/**
 * UNIVERSAL API CLIENT FOR VEHICLE RENTAL SYSTEM
 * Connects to live Express REST backend or automatically falls back to
 * persistent LocalStorage store if the backend is not yet started.
 */

const API_BASE = (typeof window !== 'undefined' && window.location.port === '5000')
  ? '/api'
  : 'http://localhost:5000/api';

// Seed dataset for client-side offline/standalone demo mode
const INITIAL_DEMO_DATA = {
  users: [
    { id: 1, name: 'Alexander Vance', full_name: 'Alexander Vance', email: 'admin@apexrentals.com', role: 'admin', phone: '+91 98201 00001', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 2, name: 'Eleanor Cross', full_name: 'Eleanor Cross', email: 'manager@apexrentals.com', role: 'manager', phone: '+91 98111 00004', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { id: 3, name: 'David Rodriguez', full_name: 'David Rodriguez', email: 'driver@apexrentals.com', role: 'driver', phone: '+91 98450 00005', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', rating: 4.95, total_trips: 148 }
  ],
  vehicles: [
    { id: 1, owner_id: 1, vehicle_number: 'MH 02 CZ 7701', brand: 'Porsche', model: 'Taycan 4S Electric', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 22000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800', location: 'Mumbai - BKC Hub', mileage: 8200, featured: 1, rating: 4.95 },
    { id: 2, owner_id: 1, vehicle_number: 'DL 01 AB 0402', brand: 'Mercedes-Benz', model: 'S-Class 580 Executive', vehicle_type: 'Luxury Sedan', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 18000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', location: 'Delhi NCR - IGI Airport T3', mileage: 12400, featured: 1, rating: 4.90 },
    { id: 3, owner_id: 1, vehicle_number: 'KA 03 MX 0908', brand: 'BMW', model: 'X7 M50i Luxury SUV', vehicle_type: 'SUV', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 7, rental_price: 16000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', location: 'Bengaluru - UB City Hub', mileage: 16500, featured: 1, rating: 4.88 },
    { id: 4, owner_id: 1, vehicle_number: 'TS 09 EV 0552', brand: 'Audi', model: 'RS e-tron GT Quattro', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 24000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800', location: 'Hyderabad - HITEC City', mileage: 6400, featured: 1, rating: 4.92 },
    { id: 5, owner_id: 1, vehicle_number: 'GA 07 EV 0303', brand: 'Tesla', model: 'Model S Plaid Tri-Motor', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 5, rental_price: 15000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', location: 'Goa - Coastal Suite', mileage: 19000, featured: 0, rating: 4.85 },
    { id: 6, owner_id: 1, vehicle_number: 'MH 01 RQ 0118', brand: 'Range Rover', model: 'Autobiography V8 Long Wheelbase', vehicle_type: 'SUV', fuel_type: 'Diesel', transmission: 'Automatic', seating_capacity: 5, rental_price: 20000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800', location: 'Mumbai - Worli Hub', mileage: 28000, featured: 0, rating: 4.80 },
    { id: 7, owner_id: 1, vehicle_number: 'TN 07 GT 0881', brand: 'Ford', model: 'Mustang GT 5.0 V8 Coupe', vehicle_type: 'Sports Car', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 4, rental_price: 12000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800', location: 'Chennai - Guindy Hub', mileage: 22100, featured: 1, rating: 4.87 },
    { id: 8, owner_id: 1, vehicle_number: 'HR 26 HY 0612', brand: 'Toyota', model: 'RAV4 Hybrid AWD Limited', vehicle_type: 'SUV', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 6500, status: 'Available', image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800', location: 'Delhi NCR - Gurugram CyberCity', mileage: 35000, featured: 0, rating: 4.75 }
  ],
  bookings: [],
  payments: [],
  invoices: [],
  maintenance: [],
  insurance: [],
  verification: [
    { id: 1, target_type: 'vehicle_doc', target_id: 1, vehicle_name: 'Porsche Taycan', document_type: 'RC & Commercial Permit (MH 02 CZ 7701)', verifier_name: 'Operations & KYC Desk', status: 'Approved', comments: 'RTO verification and fitness clearance approved.', verified_at: '2026-01-02' }
  ]
};

// Initialize localStorage DB if empty or legacy data
function getLocalStore() {
  const existing = localStorage.getItem('apex_fleet_db');
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.vehicles && parsed.vehicles[0] && parsed.vehicles[0].location && parsed.vehicles[0].location.includes('Mumbai') && parsed.users && !parsed.users.some(u => u.name === 'Sarah Jenkins')) {
        return parsed;
      }
    } catch (e) {}
  }
  localStorage.setItem('apex_fleet_db', JSON.stringify(INITIAL_DEMO_DATA));
  return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
}

function saveLocalStore(data) {
  localStorage.setItem('apex_fleet_db', JSON.stringify(data));
}

// Low-level HTTP requester with automated fallback ONLY when backend is completely offline
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('apex_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4.0s timeout before network fallback

    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (netErr) {
    // True network failure / offline backend -> graceful local client fallback
    console.warn(`[ApexFleet Offline Mode] Network unreachable for ${endpoint}. Using local storage fallback.`);
    if (typeof showToast === 'function' && ['POST', 'PUT', 'DELETE'].includes((options.method || '').toUpperCase())) {
      showToast('⚠️ Backend server (http://localhost:5000) is offline. Saved to local storage. Run "npm start" to save directly to MongoDB.', 'info');
    }
    return handleLocalFallback(endpoint, options);
  }

  // Server responded -> Parse JSON and handle HTTP response
  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new Error(`Server returned HTTP ${response.status} with invalid JSON response.`);
  }

  if (!response.ok) {
    const errorMsg = (data && data.message) ? data.message : `Server returned error status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Fallback router inside browser memory
function handleLocalFallback(endpoint, options) {
  const store = getLocalStore();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // 1. AUTH
  if (endpoint === '/auth/login' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase();
    const user = store.users.find(u => (u.email || '').toLowerCase() === email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    const token = 'mock_jwt_' + btoa(JSON.stringify(user));
    return { success: true, token, user };
  }

  if (endpoint === '/auth/register' && method === 'POST') {
    const cleanEmail = (body.email || '').trim().toLowerCase();
    if (!body.name || body.name.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters long.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    if (!body.password || body.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const existing = store.users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in or use a different email.');
    }

    const newId = store.users.length + 1;
    const role = (body.role || 'customer').toLowerCase();
    const newUser = {
      id: newId,
      name: body.name.trim(),
      email: cleanEmail,
      role: role,
      status: 'active',
      phone: body.phone ? body.phone.trim() : '+91 98201 01999',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      license_number: body.license_number ? body.license_number.trim().toUpperCase() : `DL-MH-${newId}000`,
      verification_status: 'verified',
      created_at: new Date().toISOString()
    };
    store.users.push(newUser);
    saveLocalStore(store);
    const token = 'mock_jwt_' + btoa(JSON.stringify(newUser));
    return { success: true, token, user: newUser, message: 'Account registered successfully' };
  }

  if (endpoint === '/auth/me') {
    const user = JSON.parse(localStorage.getItem('apex_user') || 'null') || store.users[0];
    return { success: true, user };
  }

  // 2. VEHICLES
  if (endpoint.startsWith('/vehicles') && method === 'GET') {
    if (endpoint.includes('/available')) {
      return { success: true, vehicles: store.vehicles.filter(v => v.status === 'Available') };
    }
    const parts = endpoint.split('/');
    if (parts.length === 3 && !isNaN(parts[2])) {
      const v = store.vehicles.find(item => item.id === parseInt(parts[2]));
      return v ? { success: true, vehicle: v } : { success: false, message: 'Not found' };
    }
    return { success: true, vehicles: store.vehicles };
  }

  if (endpoint === '/vehicles' && method === 'POST') {
    const newV = {
      id: store.vehicles.length + 1,
      ...body,
      status: 'Available',
      rating: 5.0,
      image_url: body.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'
    };
    store.vehicles.unshift(newV);
    saveLocalStore(store);
    return { success: true, vehicle: newV, message: 'Vehicle added successfully' };
  }

  if (endpoint.startsWith('/vehicles/') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const v = store.vehicles.find(item => item.id === id);
    if (v) {
      Object.assign(v, body);
      saveLocalStore(store);
      return { success: true, vehicle: v, message: 'Vehicle updated successfully' };
    }
    return { success: false, message: 'Vehicle not found' };
  }

  if (endpoint.startsWith('/vehicles/') && method === 'DELETE') {
    const id = parseInt(endpoint.split('/')[2]);
    const idx = store.vehicles.findIndex(item => item.id === id);
    if (idx !== -1) {
      store.vehicles.splice(idx, 1);
      saveLocalStore(store);
    }
    return { success: true, message: 'Vehicle removed successfully' };
  }

  // 3. BOOKINGS
  if (endpoint.startsWith('/bookings') && method === 'GET') {
    const parts = endpoint.split('/');
    if (parts.length === 3 && !isNaN(parts[2])) {
      const b = store.bookings.find(item => item.id === parseInt(parts[2]));
      return b ? { success: true, booking: b } : { success: false, message: 'Booking not found' };
    }
    return { success: true, bookings: store.bookings };
  }

  if (endpoint === '/bookings' && method === 'POST') {
    const v = store.vehicles.find(item => item.id === parseInt(body.vehicle_id));
    const newId = store.bookings.length + 1;
    const days = body.total_days || 3;
    const daily = v ? v.rental_price : 200;
    let tot = daily * days;
    if (body.driver_required) tot += 40 * days;
    if (body.insurance_opted) tot += 25 * days;
    const finalAmount = Math.round(tot * 1.1);

    const newB = {
      id: newId,
      booking_code: `BK-2026-${100 + newId}`,
      customer_id: body.customer_id || 2,
      customer_name: body.customer_name || 'Sarah Jenkins',
      customer_email: 'customer@gmail.com',
      customer_phone: '+91 98201 10102',
      vehicle_id: v ? v.id : 1,
      vehicle_name: v ? `${v.brand} ${v.model}` : 'Luxury Vehicle',
      vehicle_number: v ? v.vehicle_number : 'MH 02 CZ 7701',
      vehicle_image: v ? v.image_url : '',
      driver_id: body.driver_required ? 5 : null,
      driver_name: body.driver_required ? 'David Rodriguez' : 'Self-Drive',
      start_date: body.start_date,
      end_date: body.end_date,
      total_days: days,
      daily_rate: daily,
      total_amount: finalAmount,
      driver_required: Boolean(body.driver_required),
      insurance_opted: Boolean(body.insurance_opted),
      pickup_location: body.pickup_location || 'Mumbai - BKC Hub',
      drop_location: body.drop_location || 'Mumbai - BKC Hub',
      status: 'Pending',
      payment_status: 'Pending'
    };
    store.bookings.unshift(newB);

    // Create matching invoice
    store.invoices.unshift({
      id: store.invoices.length + 1,
      booking_id: newId,
      invoice_number: `INV-2026-00${newId}`,
      customer_name: newB.customer_name,
      subtotal: tot,
      tax_amount: Math.round(tot * 0.1),
      final_amount: finalAmount,
      status: 'Unpaid',
      issued_at: new Date().toLocaleDateString()
    });

    saveLocalStore(store);
    return { success: true, booking: newB, message: 'Booking requested successfully' };
  }

  if (endpoint.includes('/approve') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const b = store.bookings.find(item => item.id === id);
    if (b) {
      b.status = 'Approved';
      if (body.driver_id) {
        b.driver_id = parseInt(body.driver_id);
        b.driver_name = 'David Rodriguez';
      }
      saveLocalStore(store);
    }
    return { success: true, message: 'Booking approved' };
  }

  if (endpoint.includes('/reject') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const b = store.bookings.find(item => item.id === id);
    if (b) { b.status = 'Rejected'; saveLocalStore(store); }
    return { success: true, message: 'Booking rejected' };
  }

  if (endpoint.includes('/cancel') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const b = store.bookings.find(item => item.id === id);
    if (b) { b.status = 'Cancelled'; saveLocalStore(store); }
    return { success: true, message: 'Booking cancelled' };
  }

  if (endpoint.startsWith('/bookings/') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const b = store.bookings.find(item => item.id === id);
    if (b) {
      if (body.status) b.status = body.status;
      if (body.driver_id) {
        b.driver_id = parseInt(body.driver_id);
        b.driver_name = 'David Rodriguez';
      }
      saveLocalStore(store);
      return { success: true, booking: b, message: 'Booking updated' };
    }
    return { success: false, message: 'Booking not found' };
  }

  // 4. PAYMENTS
  if (endpoint.includes('/invoice/') && method === 'GET') {
    const bookingId = parseInt(endpoint.split('/').pop());
    const inv = store.invoices.find(item => item.booking_id === bookingId) || {
      invoice_number: `INV-2026-00${bookingId}`,
      booking_id: bookingId,
      customer_name: 'Sarah Jenkins',
      subtotal: 585,
      tax_amount: 58.5,
      final_amount: 643.5,
      status: 'Paid',
      issued_at: new Date().toLocaleDateString()
    };
    return { success: true, invoice: inv };
  }

  if (endpoint.startsWith('/payments') && method === 'GET') {
    return { success: true, payments: store.payments };
  }

  if (endpoint === '/payments' && method === 'POST') {
    const p = {
      id: store.payments.length + 1,
      booking_id: parseInt(body.booking_id),
      amount: parseFloat(body.amount),
      payment_method: body.payment_method || 'Credit Card',
      transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}-APX`,
      status: 'Paid',
      paid_at: new Date().toLocaleString()
    };
    store.payments.unshift(p);

    const b = store.bookings.find(item => item.id === parseInt(body.booking_id));
    if (b) { b.status = 'Confirmed'; b.payment_status = 'Paid'; }

    const inv = store.invoices.find(item => item.booking_id === parseInt(body.booking_id));
    if (inv) { inv.status = 'Paid'; }

    saveLocalStore(store);
    return { success: true, payment: p, message: 'Payment recorded successfully' };
  }

  if (endpoint.includes('/verify') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const p = store.payments.find(item => item.id === id);
    if (p) { p.status = 'Paid'; saveLocalStore(store); }
    return { success: true, message: 'Payment verified' };
  }

  if (endpoint.includes('/refund') && method === 'POST') {
    const id = parseInt(endpoint.split('/')[2]);
    const p = store.payments.find(item => item.id === id);
    if (p) { p.status = 'Refunded'; saveLocalStore(store); }
    return { success: true, message: 'Refund issued' };
  }

  // 5. MAINTENANCE
  if (endpoint.startsWith('/maintenance') && method === 'GET') {
    return { success: true, maintenance: store.maintenance };
  }

  if (endpoint === '/maintenance' && method === 'POST') {
    const v = store.vehicles.find(item => item.id === parseInt(body.vehicle_id));
    const m = {
      id: store.maintenance.length + 1,
      vehicle_id: parseInt(body.vehicle_id),
      vehicle_name: v ? `${v.brand} ${v.model}` : 'Vehicle',
      vehicle_number: v ? v.vehicle_number : 'ROV-118',
      mechanic_name: 'Viktor Ramos',
      service_date: body.service_date || new Date().toISOString().split('T')[0],
      service_type: body.service_type || 'General Service',
      description: body.description,
      cost: parseFloat(body.cost),
      next_service_date: body.next_service_date || null,
      status: 'In Progress'
    };
    if (v && body.mark_under_maintenance !== false) v.status = 'Under Maintenance';
    store.maintenance.unshift(m);
    saveLocalStore(store);
    return { success: true, record: m, message: 'Maintenance record saved' };
  }

  if (endpoint.startsWith('/maintenance/') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const m = store.maintenance.find(item => item.id === id);
    if (m) {
      Object.assign(m, body);
      if (body.mark_available || body.status === 'Completed') {
        const v = store.vehicles.find(item => item.id === m.vehicle_id);
        if (v) v.status = 'Available';
      }
      saveLocalStore(store);
      return { success: true, record: m, message: 'Maintenance record updated' };
    }
    return { success: false, message: 'Record not found' };
  }

  // 6. INSURANCE
  if (endpoint.startsWith('/insurance') && method === 'GET') {
    return { success: true, insurance: store.insurance };
  }

  if (endpoint === '/insurance' && method === 'POST') {
    const v = store.vehicles.find(item => item.id === parseInt(body.vehicle_id));
    const newPol = {
      id: store.insurance.length + 1,
      vehicle_id: parseInt(body.vehicle_id),
      vehicle_name: v ? `${v.brand} ${v.model}` : 'Vehicle',
      vehicle_number: v ? v.vehicle_number : 'POL',
      policy_number: body.policy_number,
      provider_name: body.provider_name,
      coverage_type: body.coverage_type || 'Comprehensive',
      start_date: body.start_date,
      expiry_date: body.expiry_date,
      premium_amount: parseFloat(body.premium_amount),
      status: 'Active'
    };
    store.insurance.unshift(newPol);
    saveLocalStore(store);
    return { success: true, insurance: newPol, message: 'Policy added' };
  }

  // 7. VERIFICATION
  if (endpoint.startsWith('/verification') && method === 'GET') {
    return { success: true, verifications: store.verification };
  }

  if (endpoint === '/verification' && method === 'POST') {
    const newVer = {
      id: store.verification.length + 1,
      verifier_name: 'Garrison Shaw',
      verified_at: new Date().toLocaleDateString(),
      status: 'Approved',
      ...body
    };
    store.verification.unshift(newVer);
    saveLocalStore(store);
    return { success: true, verification: newVer, message: 'Verification recorded' };
  }

  // 8. USERS
  if (endpoint.startsWith('/users') && method === 'GET') {
    return { success: true, users: store.users };
  }

  if (endpoint === '/users' && method === 'POST') {
    const newId = store.users.length + 1;
    const u = {
      id: newId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role || 'customer',
      status: 'active',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      created_at: new Date().toISOString()
    };
    store.users.unshift(u);
    saveLocalStore(store);
    return { success: true, user: u, message: 'User created' };
  }

  if (endpoint.startsWith('/users/') && method === 'PUT') {
    const id = parseInt(endpoint.split('/')[2]);
    const u = store.users.find(item => item.id === id);
    if (u) {
      Object.assign(u, body);
      saveLocalStore(store);
      return { success: true, user: u, message: 'User updated' };
    }
    return { success: false, message: 'User not found' };
  }

  if (endpoint.startsWith('/users/') && method === 'DELETE') {
    const id = parseInt(endpoint.split('/')[2]);
    const idx = store.users.findIndex(item => item.id === id);
    if (idx !== -1) {
      store.users.splice(idx, 1);
      saveLocalStore(store);
    }
    return { success: true, message: 'User removed' };
  }

  // 9. REPORTS
  if (endpoint.startsWith('/reports/revenue')) {
    const total = store.payments.reduce((s, p) => s + (p.amount || 0), 0);
    return { success: true, report: { gross_revenue: total, total_transactions: store.payments.length } };
  }

  if (endpoint.startsWith('/reports/bookings')) {
    return { success: true, report: { total_bookings: store.bookings.length, active_bookings: store.bookings.filter(b => b.status === 'Active').length } };
  }

  // Default fallback
  return { success: true, message: 'Action processed successfully' };
}

// Global API Object
const api = {
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    getMe: () => request('/auth/me')
  },
  users: {
    getAll: (params = '') => request(`/users${params}`),
    getById: (id) => request(`/users/${id}`),
    create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' })
  },
  vehicles: {
    getAll: (params = '') => request(`/vehicles${params}`),
    getAvailable: () => request('/vehicles/available'),
    getById: (id) => request(`/vehicles/${id}`),
    create: (data) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/vehicles/${id}`, { method: 'DELETE' })
  },
  bookings: {
    getAll: (params = '') => request(`/bookings${params}`),
    getById: (id) => request(`/bookings/${id}`),
    create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id, data = {}) => request(`/bookings/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) }),
    reject: (id, data = {}) => request(`/bookings/${id}/reject`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id) => request(`/bookings/${id}/cancel`, { method: 'PUT' }),
    update: (id, data) => request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  payments: {
    getAll: (params = '') => request(`/payments${params}`),
    create: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
    verify: (id) => request(`/payments/${id}/verify`, { method: 'PUT' }),
    refund: (id, data = {}) => request(`/payments/${id}/refund`, { method: 'POST', body: JSON.stringify(data) }),
    getInvoice: (bookingId) => request(`/payments/invoice/${bookingId}`)
  },
  maintenance: {
    getAll: () => request('/maintenance'),
    create: (data) => request('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  insurance: {
    getAll: () => request('/insurance'),
    create: (data) => request('/insurance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/insurance/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  verification: {
    getAll: () => request('/verification'),
    create: (data) => request('/verification', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/verification/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  reports: {
    getBookings: () => request('/reports/bookings'),
    getRevenue: () => request('/reports/revenue'),
    getVehicles: () => request('/reports/vehicles'),
    getMaintenance: () => request('/reports/maintenance')
  },
  system: {
    checkHealth: () => request('/health'),
    getDatabaseStatus: () => request('/database/status')
  }
};
