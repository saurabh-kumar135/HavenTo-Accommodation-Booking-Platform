# 🏡 HavenTo - Accommodation Booking Platform (Node.js & Express)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Framework-Express_4.21-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-brightgreen.svg)](https://www.mongodb.com/)

A modern, production-ready vacation rental and accommodation booking platform built with **Node.js, Express, MongoDB (Mongoose), and React (Vite)**. Featuring an **Autonomous AI Travel Concierge** powered by Groq LLM tool calling, OTP email verification, secure session & JWT authentication, and enterprise-grade DDoS protection.

---

## ⚡ Key Highlights

* **Autonomous AI Travel Concierge**: Powered by Groq LLM (`qwen` series) with native function/tool calling (`searchHomes`, `getHomeDetails`, `createBooking`, `cancelBooking`, `manageFavourites`) interacting directly with MongoDB.
* **Full-Stack Architecture**: High-performance RESTful backend in Express.js paired with a modern **React 18 + Vite + TailwindCSS** client SPA and EJS server-rendered views.
* **Dual Authentication System**: Supports both cookie-based `express-session` (backed by `connect-mongodb-session`) and stateless **JWT tokens** for web and mobile clients.
* **Email Verification & Password Reset**: 6-digit OTP email verification and secure, time-limited password reset tokens dispatched via **Nodemailer (Gmail SMTP/OAuth2)** and **Resend**.
* **Host & Guest Portals**:
  * **Guests**: Browse stays, search with multi-parameter filters (location, budget, rating), manage favorites, and book accommodations.
  * **Hosts**: List properties with photo uploads, manage pricing and amenities, and oversee reservation requests.
* **Enterprise Security & DDoS Hardening**:
  * **Rate Limiting**: Strict rate-limit tiers via `express-rate-limit` for OTP dispatch, authentication, password reset, and general API endpoints.
  * **Security Headers**: Comprehensive header hardening via `helmet`.
  * **Password Security**: Salted Bcrypt password hashing (10 salt rounds).
  * **CORS**: Environment-aware origin validation with credentials support.
* **Image & File Uploads**: Multi-part form handling with `multer` supporting disk and MongoDB GridFS storage.
* **Containerization**: Production Docker setup with `Dockerfile` and `compose.yaml`.

---

## 🛠️ Tech Stack

### Backend
* **Runtime**: Node.js (v18.x / v20.x)
* **Framework**: Express.js (v4.21)
* **Database & ODM**: MongoDB Atlas with Mongoose (v8.12)
* **Session Store**: `express-session` with `connect-mongodb-session`
* **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
* **AI & Agent Service**: Groq SDK (`groq-sdk`) with tool/function calling
* **Email Services**: Nodemailer (Gmail SMTP) & Resend
* **File Uploads**: Multer
* **Security**: Helmet, Express Rate Limit, CORS, Express Validator
* **Mobile Support**: Expo Server SDK (`expo-server-sdk`)

### Frontend
* **SPA Framework**: React 18
* **Build Tool**: Vite
* **Styling**: TailwindCSS
* **Routing**: React Router v6
* **Templating**: EJS (for server-rendered flows and email templates)

---

## 🏗️ Project Structure

```text
HavenTo/
├── client/                      # React 18 + Vite + TailwindCSS Frontend SPA
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, Cards, Modals)
│   │   ├── context/             # React Context providers (Auth, Booking)
│   │   ├── pages/               # Views (Home, PropertyDetail, Host, Bookings)
│   │   └── services/            # API integration services (Axios/Fetch)
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite configuration
├── controllers/                 # Express MVC Route Controllers
│   ├── authController.js        # User signup, login, session & JWT handling
│   ├── emailVerificationController.js # 6-digit email OTP generation & verification
│   ├── passwordResetController.js     # Password reset token issuance & updates
│   ├── storeController.js       # Property search, filtering, favorites & booking
│   ├── hostController.js        # Host property listing creation, edits & reservations
│   └── agentController.js       # Groq AI concierge chat endpoint
├── middleware/                  # Custom Express Middleware
│   ├── auth.js                  # Session & JWT authentication guards
│   └── rateLimiter.js           # DDoS protection & endpoint rate limits
├── models/                      # Mongoose Schemas & Models
│   ├── user.js                  # User credentials, roles (guest/host), verification status
│   ├── home.js                  # Property listings, amenities, pricing, location
│   └── booking.js               # Reservations, check-in/out dates, status, cancellation
├── routes/                      # Express Route Definitions
│   ├── authRouter.js            # /api/auth (Login, register, logout)
│   ├── emailVerificationRoutes.js # /api/auth/verify-otp, resend-otp
│   ├── passwordResetRoutes.js   # /api/auth/reset-password/*
│   ├── storeRouter.js           # /api/homes, /api/store/*
│   ├── hostRouter.js            # /api/host/*
│   └── agentRouter.js           # /api/agent (AI travel concierge)
├── services/                    # Business & Integration Services
│   └── agentService.js          # Groq LLM tool-calling loop & MongoDB execution
├── utils/                       # Shared Utilities
│   ├── emailService.js          # Nodemailer & Resend email dispatchers
│   ├── otpService.js            # OTP generation, expiration & validation
│   ├── otpStorage.js            # In-memory / cache OTP storage
│   ├── pathUtil.js              # Filesystem path helpers
│   └── pushNotifications.js     # Expo push notification dispatch
├── views/                       # Server-side EJS templates
├── public/                      # Static assets (compiled CSS, client JS, icons)
├── uploads/                     # User-uploaded property media
├── .env.example                 # Environment configuration template
├── app.js                       # Express server entry point & middleware pipeline
├── Dockerfile                   # Backend Docker container definition
├── compose.yaml                 # Docker Compose local orchestration
└── package.json                 # Node dependencies and npm scripts
```

---

## 🚦 Getting Started

### Prerequisites
* **Node.js**: v18.x or v20.x
* **npm**: v9.x or higher
* **MongoDB**: Local MongoDB instance or MongoDB Atlas URI
* **Groq API Key**: For the AI travel concierge assistant

### 1. Clone the Repository
```bash
git clone https://github.com/saurabh-kumar135/HavenTo-Accommodation-Booking-Platform.git
cd HavenTo-Accommodation-Booking-Platform
```

### 2. Backend Setup
Install root dependencies:
```bash
npm install
```

Create a `.env` file in the root directory:
```env
# Server
PORT=3009
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_strong_session_secret
JWT_SECRET=your_jwt_secret_key

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/HavenTo?retryWrites=true&w=majority

# AI Concierge (Groq)
GROQ_API_KEY=gsk_your_groq_api_key

# Email Service (Gmail SMTP / OAuth2)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
# Or Resend
RESEND_API_KEY=re_your_resend_api_key
```

Start the backend in development mode:
```bash
npm run dev
```
The backend server runs on `http://localhost:3009`.

### 3. Frontend Setup (React SPA)
In a separate terminal, navigate to the `client` directory:
```bash
cd client
npm install
```

Create a `.env` file inside `client/`:
```env
VITE_API_URL=http://localhost:3009
```

Start the Vite development server:
```bash
npm run dev
```
The React frontend runs on `http://localhost:5173`.

---

## 🤖 Autonomous AI Travel Concierge

HavenTo features an integrated AI booking agent implemented in `services/agentService.js`. Powered by Groq's high-speed inference engine, the agent uses function/tool calling to execute actions against the live database:

* **`searchHomes(location, maxPrice, minRating)`**: Queries MongoDB for available stays matching user constraints.
* **`getHomeDetails(homeId)`**: Fetches comprehensive property descriptions, host info, and amenities.
* **`createBooking(homeId, checkIn, checkOut, guests)`**: Automates reservation creation for verified users.
* **`cancelBooking(bookingId, reason)`**: Executes booking cancellations complying with 24-hour lead-time rules.
* **`manageFavourites(action, homeId)`**: Adds or removes properties from the user's wishlist.

---

## 🛡️ Security & DDoS Protection Details

| Endpoint Category | Rate Limit | Time Window | Purpose |
| :--- | :--- | :--- | :--- |
| **Email OTP Dispatch** | 3 requests | 15 minutes | Prevents email inbox bombing & SMS/email spam |
| **Password Reset** | 3 requests | 1 hour | Prevents token harvesting & resource exhaustion |
| **Authentication (Login/Register)** | 5 attempts | 1 hour | Blocks brute-force credential stuffing attacks |
| **General API Routes** | 100 requests | 15 minutes | Protects backend against high-volume DDoS floods |

---

## 🐳 Docker Deployment

Run the complete backend stack with Docker:

```bash
docker compose up --build -d
```

---

## 📝 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

## 👨‍💻 Author

**Saurabh Kumar**
* GitHub: [@saurabh-kumar135](https://github.com/saurabh-kumar135)
