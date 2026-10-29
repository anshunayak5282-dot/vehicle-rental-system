// In-memory data store with full seed datasets for resilient local testing and fallback

const roles = [
  { id: 1, name: 'admin', label: 'Admin', description: 'Overall system administration' },
  { id: 2, name: 'customer', label: 'Customer', description: 'Vehicle renter' },
  { id: 3, name: 'manager', label: 'Rental Manager', description: 'Rental operations' },
  { id: 4, name: 'driver', label: 'Driver', description: 'Chauffeur and trip execution' }
];

let users = [
  { id: 1, name: 'Alexander Vance', full_name: 'Alexander Vance', email: 'admin@apexrentals.com', password: 'Password@123', phone: '+91 98201 00001', role_id: 1, role: 'admin', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', created_at: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Eleanor Cross', full_name: 'Eleanor Cross', email: 'manager@apexrentals.com', password: 'Password@123', phone: '+91 98111 00004', role_id: 3, role: 'manager', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', created_at: '2026-01-04T00:00:00Z' },
  { id: 3, name: 'David Rodriguez', full_name: 'David Rodriguez', email: 'driver@apexrentals.com', password: 'Password@123', phone: '+91 98450 00005', role_id: 4, role: 'driver', status: 'active', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', rating: 4.95, total_trips: 148, created_at: '2026-01-05T00:00:00Z' }
];

let vehicles = [
  { id: 1, owner_id: 1, vehicle_number: 'MH 02 CZ 7701', brand: 'Porsche', model: 'Taycan 4S Electric', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 22000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800', location: 'Mumbai - BKC Hub', mileage: 8200, featured: 1, rating: 4.95 },
  { id: 2, owner_id: 1, vehicle_number: 'DL 01 AB 0402', brand: 'Mercedes-Benz', model: 'S-Class 580 Executive', vehicle_type: 'Luxury Sedan', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 18000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', location: 'Delhi NCR - IGI Airport T3', mileage: 12400, featured: 1, rating: 4.90 },
  { id: 3, owner_id: 1, vehicle_number: 'KA 03 MX 0908', brand: 'BMW', model: 'X7 M50i Luxury 7-Seater', vehicle_type: 'SUV', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 7, rental_price: 16000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', location: 'Bengaluru - UB City Hub', mileage: 16500, featured: 1, rating: 4.88 },
  { id: 4, owner_id: 1, vehicle_number: 'TS 09 EV 0552', brand: 'Audi', model: 'RS e-tron GT Quattro', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 4, rental_price: 24000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800', location: 'Hyderabad - HITEC City', mileage: 6400, featured: 1, rating: 4.92 },
  { id: 5, owner_id: 1, vehicle_number: 'GA 07 EV 0303', brand: 'Tesla', model: 'Model S Plaid Tri-Motor', vehicle_type: 'Electric', fuel_type: 'Electric', transmission: 'Automatic', seating_capacity: 5, rental_price: 15000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', location: 'Goa - Coastal Suite', mileage: 19000, featured: 0, rating: 4.85 },
  { id: 6, owner_id: 1, vehicle_number: 'MH 01 RQ 0118', brand: 'Range Rover', model: 'Autobiography V8 Long Wheelbase', vehicle_type: 'SUV', fuel_type: 'Diesel', transmission: 'Automatic', seating_capacity: 5, rental_price: 20000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800', location: 'Mumbai - Worli Hub', mileage: 28000, featured: 0, rating: 4.80 },
  { id: 7, owner_id: 1, vehicle_number: 'TN 07 GT 0881', brand: 'Ford', model: 'Mustang GT 5.0 V8 Coupe', vehicle_type: 'Sports Car', fuel_type: 'Petrol', transmission: 'Automatic', seating_capacity: 4, rental_price: 12000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800', location: 'Chennai - Guindy Hub', mileage: 22100, featured: 1, rating: 4.87 },
  { id: 8, owner_id: 1, vehicle_number: 'HR 26 HY 0612', brand: 'Toyota', model: 'RAV4 Hybrid AWD Limited', vehicle_type: 'SUV', fuel_type: 'Hybrid', transmission: 'Automatic', seating_capacity: 5, rental_price: 6500, status: 'Available', image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800', location: 'Delhi NCR - Gurugram CyberCity', mileage: 35000, featured: 0, rating: 4.75 }
];

let bookings = [];

let payments = [];

let invoices = [];

let maintenanceRecords = [];

let insuranceRecords = [];

let verificationRecords = [
  { id: 1, target_type: 'vehicle_doc', target_id: 1, vehicle_name: 'Porsche Taycan (MH 02 CZ 7701)', document_type: 'RC & Commercial Permit', verified_by: 3, verifier_name: 'Operations Desk', status: 'Approved', comments: 'RTO emissions and registration compliance verified.', verified_at: '2026-01-02T14:30:00Z' }
];

let feedbackList = [];

module.exports = {
  roles,
  users,
  vehicles,
  bookings,
  payments,
  invoices,
  maintenanceRecords,
  insuranceRecords,
  verificationRecords,
  feedbackList
};
