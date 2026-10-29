-- ===================================================
-- VEHICLE RENTAL SYSTEM - COMPLETE DATABASE SCHEMA
-- Compatible with MySQL 8.0+ / MariaDB
-- ===================================================

CREATE DATABASE IF NOT EXISTS vehicle_rental;
USE vehicle_rental;

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role_id INT NOT NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- 3. CUSTOMER DETAILS
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  license_number VARCHAR(50),
  license_expiry DATE,
  id_proof_type VARCHAR(50) DEFAULT 'Passport / National ID',
  id_proof_number VARCHAR(100),
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  address TEXT,
  city VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. VEHICLE OWNERS
CREATE TABLE IF NOT EXISTS vehicle_owners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bank_account VARCHAR(50),
  bank_ifsc VARCHAR(50),
  total_earnings DECIMAL(12, 2) DEFAULT 0.00,
  payout_status ENUM('active', 'hold') DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  license_number VARCHAR(50) NOT NULL,
  experience_years INT DEFAULT 3,
  availability_status ENUM('available', 'on_trip', 'off_duty') DEFAULT 'available',
  rating DECIMAL(3, 2) DEFAULT 5.00,
  total_trips INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NULL DEFAULT NULL,
  vehicle_number VARCHAR(50) NOT NULL UNIQUE,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  vehicle_type ENUM('Luxury Sedan', 'SUV', 'Sports Car', 'Electric', 'Hatchback', 'Motorbike') NOT NULL,
  fuel_type ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid') DEFAULT 'Petrol',
  transmission ENUM('Automatic', 'Manual') DEFAULT 'Automatic',
  seating_capacity INT DEFAULT 5,
  rental_price DECIMAL(10, 2) NOT NULL, -- Daily rate
  status ENUM('Available', 'Booked', 'Rented', 'Under Maintenance', 'Unavailable') DEFAULT 'Available',
  image_url VARCHAR(500),
  location VARCHAR(100) DEFAULT 'Mumbai - BKC Hub',
  mileage INT DEFAULT 15000,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. VEHICLE DOCUMENTS
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  document_type ENUM('RC', 'Insurance', 'Pollution', 'Fitness', 'Permit') NOT NULL,
  document_number VARCHAR(100),
  file_url VARCHAR(500),
  expiry_date DATE,
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'verified',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 8. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  driver_id INT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL DEFAULT 1,
  daily_rate DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  driver_required BOOLEAN DEFAULT FALSE,
  insurance_opted BOOLEAN DEFAULT TRUE,
  pickup_location VARCHAR(150) NOT NULL,
  drop_location VARCHAR(150) NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Confirmed', 'Active', 'Completed', 'Cancelled') DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. BOOKING ASSIGNMENTS (Manager Ops)
CREATE TABLE IF NOT EXISTS booking_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  assigned_vehicle_id INT NOT NULL,
  assigned_driver_id INT NULL,
  manager_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 10. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('Credit Card', 'Debit Card', 'UPI / Online', 'Cash', 'Net Banking') DEFAULT 'Credit Card',
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded') DEFAULT 'Pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  final_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('Unpaid', 'Paid', 'Refunded') DEFAULT 'Unpaid',
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 12. MAINTENANCE TABLE (Mechanic)
CREATE TABLE IF NOT EXISTS maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  mechanic_id INT NOT NULL,
  service_date DATE NOT NULL,
  service_type VARCHAR(100) DEFAULT 'Routine Maintenance',
  description TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  next_service_date DATE,
  status ENUM('Scheduled', 'In Progress', 'Completed') DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 13. INSURANCE TABLE
CREATE TABLE IF NOT EXISTS insurance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  policy_number VARCHAR(100) NOT NULL UNIQUE,
  provider_name VARCHAR(100) NOT NULL,
  coverage_type VARCHAR(100) DEFAULT 'Comprehensive Zero-Depreciation',
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  premium_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('Active', 'Expiring Soon', 'Expired') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 14. INSURANCE CLAIMS
CREATE TABLE IF NOT EXISTS insurance_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  insurance_id INT NOT NULL,
  incident_date DATE NOT NULL,
  claim_amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  claim_status ENUM('Submitted', 'Under Review', 'Approved', 'Settled', 'Rejected') DEFAULT 'Submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (insurance_id) REFERENCES insurance(id) ON DELETE CASCADE
);

-- 15. VERIFICATION TABLE (Security Staff)
CREATE TABLE IF NOT EXISTS verification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('customer_doc', 'vehicle_doc', 'handover', 'return') NOT NULL,
  target_id INT NOT NULL,
  verified_by INT NOT NULL,
  document_type VARCHAR(100),
  status ENUM('Approved', 'Rejected', 'Needs Recheck') DEFAULT 'Approved',
  comments TEXT,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 16. VEHICLE HANDOVER TABLE (Receptionist & Security)
CREATE TABLE IF NOT EXISTS vehicle_handover (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  staff_id INT NOT NULL,
  odometer_reading INT NOT NULL,
  fuel_level VARCHAR(20) DEFAULT '100% Full',
  handover_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  customer_signature BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 17. VEHICLE RETURNS TABLE (Receptionist & Security)
CREATE TABLE IF NOT EXISTS vehicle_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  staff_id INT NOT NULL,
  return_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  odometer_reading INT NOT NULL,
  fuel_level VARCHAR(20) DEFAULT '90%',
  condition_status ENUM('Pristine', 'Minor Wear', 'Damaged') DEFAULT 'Pristine',
  damage_fee DECIMAL(10, 2) DEFAULT 0.00,
  penalty_fee DECIMAL(10, 2) DEFAULT 0.00,
  refund_status ENUM('Completed', 'Pending', 'No Refund') DEFAULT 'Completed',
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 18. DAMAGE RECORDS
CREATE TABLE IF NOT EXISTS damage_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  booking_id INT NULL,
  reported_by INT NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
  estimated_repair_cost DECIMAL(10, 2) DEFAULT 0.00,
  status ENUM('Reported', 'Assessed', 'Repaired') DEFAULT 'Reported',
  photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 19. FEEDBACK & RATINGS
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  customer_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  driver_id INT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 20. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NULL,
  customer_id INT NOT NULL,
  subject VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  status ENUM('Open', 'In Review', 'Resolved', 'Dismissed') DEFAULT 'Open',
  resolved_by INT NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);
