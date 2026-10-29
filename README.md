# ⚡ Apex Fleet — Luxury Vehicle Rental System (India Edition)

> **A Premium, High-Performance Enterprise Full-Stack Vehicle Rental Platform supporting 4 Core User Roles with Pan-India Locations and INR Pricing.**

Built strictly adhering to the technical specifications:
- **Frontend:** Pure HTML5, CSS3, Modern JavaScript (No React required, ultra-fast, luxury obsidian & amber automotive theme).
- **Pricing:** Indian Rupees (₹ / INR) with dynamic GST (Goods & Services Tax) calculation.
- **Locations & RTO Plates:** Indian luxury metro hubs (Mumbai BKC, Delhi NCR IGI Airport T3, Bengaluru UB City, Hyderabad HITEC City, Goa Coastal Suite) and authentic Indian state registration number plates (`MH 02 CZ 7701`, `DL 01 AB 0402`, `KA 03 MX 0908`, `TS 09 EV 0552`, `GA 07 EV 0303`, etc.).
- **Backend:** Node.js + Express.js REST API with JWT authentication and bcrypt password hashing.
- **Dual Database Support:** Native MongoDB (Mongoose schemas & models) and MySQL relational database (`schema.sql` and `seed.sql`), with auto-detection and seamless fallback.
- **Resilience:** Built-in auto-detecting client API layer and graceful in-memory store so the entire website runs **instantly out-of-the-box** in both offline/browser mode, full MongoDB mode, and full MySQL mode!

---

## 🌟 4 Core User Portals & Pre-configured Demo Accounts

Every role comes with pre-seeded demo accounts. The default demo password for all accounts is:  
👉 **`Password@123`**

| # | Role | Name | Email | Phone | Key Capabilities |
|---|---|---|---|---|---|
| 1 | **System Admin** | Alexander Vance | `admin@apexrentals.com` | `+91 98201 00001` | Full governance, user accounts (4 core roles), fleet inventory, revenue analytics, master ledger |
| 2 | **Customer** | Sarah Jenkins | `customer@gmail.com` | `+91 98201 10102` | Browse luxury fleet, date picker, chauffeur option, instant booking, checkout in INR, GST invoices, reviews |
| 3 | **Rental Manager** | Eleanor Cross | `manager@apexrentals.com` | `+91 98111 00004` | Booking approval/rejection queue, driver dispatch board, daily pickup & return schedule |
| 4 | **Driver (Chauffeur)** | David Rodriguez | `driver@apexrentals.com` | `+91 98450 00005` | Assigned executive passenger trips, Indian route itineraries, passenger call, start/drop trip status |

> 💡 **Quick 1-Click Role Switcher:** A sticky testing bar is integrated at the top of every page. You can switch between all 4 core roles in 1 click without manually logging in and out!

---

## 📁 Project Directory Structure

```text
vehicle-rental-system/
├── README.md
├── package.json
├── backend/
│   ├── package.json
│   ├── server.js                  # Main Express Server
│   ├── .env                       # Environment configuration (MongoDB & MySQL)
│   ├── config/
│   │   ├── mongodb.js             # MongoDB connection manager (Mongoose)
│   │   └── db.js                  # MySQL connection pool with graceful offline fallback
│   ├── models/                    # Mongoose Models (User, Vehicle, Booking, Payment, etc.)
│   ├── database/
│   │   ├── mongoSeed.js           # Standalone MongoDB seeder script
│   │   ├── mongoSeed.json         # Raw JSON seed dataset
│   │   ├── schema.sql             # Relational MySQL Tables
│   │   └── seed.sql               # Seed data for MySQL
│   ├── controllers/               # Express Controllers (Auth, Users, Vehicles, Bookings, etc.)
│   ├── routes/                    # Express REST API Routes
│   ├── middleware/                # JWT auth, role authorization, error handling
│   ├── services/
│   │   └── mockDataStore.js       # Fallback store for instant zero-config testing
│   └── utils/
│       ├── jwt.js                 # JWT sign and verify
│       └── validation.js          # Input validation
└── frontend/
    ├── index.html                 # Flagship luxury landing page & search widget
    ├── login.html                 # Login with 1-click demo account switcher
    ├── register.html              # Customer & Owner registration with KYC upload
    ├── css/
    │   ├── style.css              # Core design system & luxury palette
    │   ├── dashboard.css          # Sidebar, KPI metrics, tables, and modals
    │   ├── forms.css              # Inputs, price breakdown cards, badges
    │   └── responsive.css         # Mobile & tablet responsiveness
    ├── js/
    │   ├── api.js                 # Universal API client (Express API or LocalStore fallback)
    │   ├── auth.js                # Auth sessions, guards, and 1-click role switcher
    │   ├── common.js              # Toasts, modals, formatters, demo banner
    │   ├── vehicles.js            # Catalog rendering and category filters
    │   ├── bookings.js            # Price calculations, driver add-on, approval lifecycle
    │   └── payments.js            # Checkout processor and official printable invoice
    └── pages/
        ├── customer/              # Customer portal (dashboard, vehicles, booking, history, profile)
        ├── admin/                 # Admin portal (dashboard, users, fleet, bookings, reports)
        ├── owner/                 # Owner portal (dashboard, vehicles, income)
        ├── manager/               # Manager portal (dispatch dashboard, daily operations)
        ├── driver/                # Driver portal (assigned trips, start/end trip)
        └── staff/                 # Staff desks (maintenance, payments, receptionist, insurance, verification)
```

---

## 🚀 How to Run the Website

### Option 1: Instant Zero-Config Browser View (Fastest)
1. Navigate into `frontend/`
2. Simply double-click **`index.html`** or open with VS Code **Live Server**.
3. The site runs completely functional right in your browser with persistent data and full simulation for all 10 roles!

### Option 2: Full-Stack Node.js Server
1. Open terminal in the `backend` folder:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. The server starts at `http://localhost:5000`.
3. Open your browser and navigate to:
   - **Website & Portals:** `http://localhost:5000`
   - **REST API Endpoint:** `http://localhost:5000/api`
   - **API Health Check:** `http://localhost:5000/api/health`

### Option 3: Connect to Live MongoDB Database (Recommended)
1. Ensure your local MongoDB service is running (or obtain your MongoDB Atlas connection string).
2. Configure MongoDB in `backend/.env`:
   ```env
   DB_TYPE=mongodb
   MONGODB_URI=mongodb://127.0.0.1:27017/vehicle_rental
   ```
3. Install dependencies and seed the initial dataset:
   ```bash
   cd backend
   npm install mongoose mongodb
   npm run seed:mongo
   ```
4. Start the backend:
   ```bash
   npm start
   ```
   The backend will connect to MongoDB and auto-seed if the collections are fresh!

### Option 4: Connect to Live MySQL Database
1. Open your MySQL client (MySQL Workbench, phpMyAdmin, or CLI).
2. Execute the database scripts in order:
   ```bash
   mysql -u root -p < backend/database/schema.sql
   mysql -u root -p < backend/database/seed.sql
   ```
3. Update database credentials in `backend/.env`:
   ```env
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_password
   DB_NAME=vehicle_rental
   ```
4. Start the backend: `npm start`.

---

## 📡 REST API Reference

| Endpoint | Method | Role Access | Description |
|---|---|---|---|
| `/api/auth/register` | POST | Public | Customer or Owner registration |
| `/api/auth/login` | POST | Public | User login, returns JWT token & role |
| `/api/auth/me` | GET | Authenticated | Current logged-in user profile |
| `/api/vehicles` | GET | Public | Fleet catalog with filtering |
| `/api/vehicles/available` | GET | Public | Available vehicles only |
| `/api/vehicles` | POST | Admin, Owner, Manager | Add new vehicle to fleet |
| `/api/vehicles/:id` | PUT | Admin, Owner, Manager, Mechanic | Update vehicle details or status |
| `/api/vehicles/:id` | DELETE | Admin, Owner | Remove vehicle from fleet |
| `/api/bookings` | GET | Authenticated | List bookings (scoped by role) |
| `/api/bookings` | POST | Customer, Receptionist | Create new booking |
| `/api/bookings/:id/approve` | PUT | Admin, Manager, Receptionist | Approve booking |
| `/api/bookings/:id/reject` | PUT | Admin, Manager | Reject booking with reason |
| `/api/bookings/:id/cancel` | PUT | Customer, Manager, Admin | Cancel booking |
| `/api/payments` | GET | Admin, Accountant, Manager | List transaction ledger |
| `/api/payments` | POST | Customer, Accountant | Process payment |
| `/api/payments/:id/verify` | PUT | Admin, Accountant | Verify transaction |
| `/api/payments/:id/refund` | POST | Admin, Accountant | Process refund |
| `/api/payments/invoice/:bookingId`| GET | Authenticated | Get printable tax invoice |
| `/api/maintenance` | GET | Admin, Mechanic, Manager | Maintenance records |
| `/api/maintenance` | POST | Admin, Mechanic | Create service ticket |
| `/api/maintenance/:id` | PUT | Admin, Mechanic | Complete repair, mark Available |
| `/api/insurance` | GET | Admin, Insurance, Manager | Insurance policies |
| `/api/insurance` | POST | Admin, Insurance | Register insurance policy |
| `/api/verification` | GET | Admin, Verification, Security | Document verification logs |
| `/api/verification` | POST | Admin, Verification | Record KYC/damage verification |
| `/api/reports/revenue` | GET | Admin, Accountant | Platform financial statements |
| `/api/reports/bookings` | GET | Admin, Manager | Booking utilization analytics |

---

## 🎨 Design Highlights
- **Obsidian & Electric Amber Luxury Theme:** Tailored for executive transport and exotic fleets.
- **Dynamic Pricing Engine:** Calculates base rental, driver service (+₹1,500/day), zero-dep insurance (+₹1,000/day), and GST in real time.
- **Printable Tax Invoices:** Built-in invoice viewer with one-click print/PDF functionality.
- **Fluid Responsiveness:** Fully adapted for mobile smartphones, tablets, laptops, and ultra-wide displays.
