-- ===================================================
-- SEED DATA FOR VEHICLE RENTAL SYSTEM
-- Contains test accounts for the 4 core roles:
-- Password for all seed accounts is: Password@123 (bcrypt hash below)
-- ===================================================

USE vehicle_rental;

-- 1. INSERT ROLES (4 Core Roles)
INSERT INTO roles (id, name, label, description) VALUES
(1, 'admin', 'Admin', 'Overall system administration and governance'),
(2, 'customer', 'Customer', 'Browses, reserves, and rents vehicles'),
(3, 'manager', 'Rental Manager', 'Oversees rental schedules, dispatches, and fleet logistics'),
(4, 'driver', 'Driver', 'Chauffeur and trip fulfillment specialist')
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- 2. INSERT USERS (bcrypt hash for 'Password@123': $2b$10$EPwD85yGf7kZ61F4f/6Pse4JbVw39nJ64J2bH8qFq2hZ91PjX3C2m)
INSERT INTO users (id, name, email, password, phone, role_id, status, avatar_url) VALUES
(1, 'Alexander Vance', 'admin@apexrentals.com', '$2b$10$EPwD85yGf7kZ61F4f/6Pse4JbVw39nJ64J2bH8qFq2hZ91PjX3C2m', '+91 98201 00001', 1, 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
(2, 'Sarah Jenkins', 'customer@gmail.com', '$2b$10$EPwD85yGf7kZ61F4f/6Pse4JbVw39nJ64J2bH8qFq2hZ91PjX3C2m', '+91 98201 10102', 2, 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
(3, 'Eleanor Cross', 'manager@apexrentals.com', '$2b$10$EPwD85yGf7kZ61F4f/6Pse4JbVw39nJ64J2bH8qFq2hZ91PjX3C2m', '+91 98111 00004', 3, 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
(4, 'David Rodriguez', 'driver@apexrentals.com', '$2b$10$EPwD85yGf7kZ61F4f/6Pse4JbVw39nJ64J2bH8qFq2hZ91PjX3C2m', '+91 98450 00005', 4, 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. SPECIFIC ROLE TABLES
INSERT INTO customers (id, user_id, license_number, license_expiry, id_proof_type, id_proof_number, verification_status, address, city) VALUES
(1, 2, 'MH-02-20220098432', '2028-11-20', 'Passport', 'Z4829104', 'verified', '14, Altamount Road, Cumballa Hill', 'Mumbai')
ON DUPLICATE KEY UPDATE license_number=VALUES(license_number);

INSERT INTO drivers (id, user_id, license_number, experience_years, availability_status, rating, total_trips) VALUES
(1, 4, 'DL-MH-COMM-7788', 6, 'available', 4.95, 148)
ON DUPLICATE KEY UPDATE rating=VALUES(rating);

-- 4. VEHICLES
INSERT INTO vehicles (id, owner_id, vehicle_number, brand, model, vehicle_type, fuel_type, transmission, seating_capacity, rental_price, status, image_url, location, mileage, featured) VALUES
(1, 1, 'MH 02 CZ 7701', 'Porsche', 'Taycan 4S Electric', 'Electric', 'Electric', 'Automatic', 4, 22000.00, 'Available', 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800', 'Mumbai - BKC Hub', 8200, 1),
(2, 1, 'DL 01 AB 0402', 'Mercedes-Benz', 'S-Class 580', 'Luxury Sedan', 'Hybrid', 'Automatic', 5, 18000.00, 'Available', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', 'Delhi NCR - IGI Airport T3', 12400, 1),
(3, 1, 'KA 03 MX 0908', 'BMW', 'X7 M50i Luxury SUV', 'SUV', 'Petrol', 'Automatic', 7, 16000.00, 'Available', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', 'Bengaluru - UB City Hub', 16500, 1),
(4, 1, 'TS 09 EV 0552', 'Audi', 'RS e-tron GT', 'Electric', 'Electric', 'Automatic', 4, 24000.00, 'Booked', 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800', 'Hyderabad - HITEC City', 6400, 1),
(5, 1, 'GA 07 EV 0303', 'Tesla', 'Model S Plaid', 'Electric', 'Electric', 'Automatic', 5, 15000.00, 'Rented', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', 'Goa - Coastal Suite', 19000, 0),
(6, 1, 'MH 01 RQ 0118', 'Range Rover', 'Autobiography V8', 'SUV', 'Diesel', 'Automatic', 5, 20000.00, 'Under Maintenance', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800', 'Mumbai - Worli Hub', 28000, 0),
(7, 1, 'TN 07 GT 0881', 'Ford', 'Mustang GT Premium', 'Sports Car', 'Petrol', 'Automatic', 4, 12000.00, 'Available', 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800', 'Chennai - Guindy Hub', 22100, 1),
(8, 1, 'HR 26 HY 0612', 'Toyota', 'RAV4 Hybrid AWD', 'SUV', 'Hybrid', 'Automatic', 5, 6500.00, 'Available', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800', 'Delhi NCR - Gurugram CyberCity', 35000, 0)
ON DUPLICATE KEY UPDATE model=VALUES(model);

-- 5. BOOKINGS
INSERT INTO bookings (id, customer_id, vehicle_id, driver_id, start_date, end_date, total_days, daily_rate, total_amount, driver_required, insurance_opted, pickup_location, drop_location, status, notes) VALUES
(1, 2, 4, 4, CURDATE() + INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY, 3, 24000.00, 87450.00, 1, 1, 'Delhi NCR - IGI Airport T3', 'Mumbai - BKC Hub', 'Confirmed', 'Executive transfer needed with luggage assistance'),
(2, 2, 5, NULL, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY, 3, 15000.00, 52800.00, 0, 1, 'Goa - Coastal Suite', 'Goa - Coastal Suite', 'Active', 'Self-drive rental along coastal corridor'),
(3, 2, 1, NULL, CURDATE() - INTERVAL 15 DAY, CURDATE() - INTERVAL 12 DAY, 3, 22000.00, 75900.00, 0, 1, 'Mumbai - BKC Hub', 'Mumbai - BKC Hub', 'Completed', 'Flawless weekend rental in Mumbai')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 6. PAYMENTS
INSERT INTO payments (id, booking_id, customer_id, amount, payment_method, transaction_id, status, paid_at) VALUES
(1, 1, 2, 87450.00, 'Credit Card', 'TXN-984214-APX', 'Paid', NOW()),
(2, 2, 2, 52800.00, 'UPI / Online', 'TXN-984215-APX', 'Paid', NOW() - INTERVAL 1 DAY),
(3, 3, 2, 75900.00, 'Credit Card', 'TXN-984210-APX', 'Paid', NOW() - INTERVAL 15 DAY)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 7. INVOICES
INSERT INTO invoices (id, booking_id, invoice_number, subtotal, tax_amount, discount_amount, final_amount, status, issued_at) VALUES
(1, 1, 'INV-2026-001', 79500.00, 7950.00, 0.00, 87450.00, 'Paid', NOW()),
(2, 2, 'INV-2026-002', 48000.00, 4800.00, 0.00, 52800.00, 'Paid', NOW() - INTERVAL 1 DAY),
(3, 3, 'INV-2026-003', 69000.00, 6900.00, 0.00, 75900.00, 'Paid', NOW() - INTERVAL 15 DAY)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 8. MAINTENANCE
INSERT INTO maintenance (id, vehicle_id, mechanic_id, service_date, service_type, description, cost, next_service_date, status) VALUES
(1, 6, 4, CURDATE(), 'Brake & Suspension Overhaul', 'Replaced front ceramic rotors and calibrated adaptive air suspension sensors.', 68000.00, CURDATE() + INTERVAL 90 DAY, 'In Progress'),
(2, 1, 4, CURDATE() - INTERVAL 45 DAY, 'Electric Battery Diagnostic', 'Software firmware update 2.4.1 and high voltage battery health check at 98.4% capacity.', 14500.00, CURDATE() + INTERVAL 120 DAY, 'Completed')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 9. INSURANCE
INSERT INTO insurance (id, vehicle_id, policy_number, provider_name, coverage_type, start_date, expiry_date, premium_amount, status) VALUES
(1, 1, 'POL-TY-9921', 'HDFC ERGO General Insurance', 'Comprehensive Zero-Depreciation + Roadside Assistance', '2026-01-01', '2027-01-01', 115000.00, 'Active'),
(2, 6, 'POL-RR-4412', 'ICICI Lombard Fleet', 'Full Collision & Total Loss Protection', '2025-11-15', '2026-11-15', 145000.00, 'Active')
ON DUPLICATE KEY UPDATE policy_number=VALUES(policy_number);

-- 10. FEEDBACK
INSERT INTO feedback (id, booking_id, customer_id, vehicle_id, driver_id, rating, comments) VALUES
(1, 3, 2, 1, NULL, 5, 'Spectacular driving experience in Mumbai! The Taycan arrived spotless, battery at 100%, and the concierge service was seamless.')
ON DUPLICATE KEY UPDATE rating=VALUES(rating);
