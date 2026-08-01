// External Module
const express = require("express");
const authRouter = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'havento_mobile_secret_key_2024';

const authController = require("../controllers/authController");

authRouter.get("/api/auth/login", authController.getLogin);
authRouter.post("/api/auth/login", authController.postLogin);
authRouter.post("/api/auth/logout", authController.postLogout);
authRouter.get("/api/auth/signup", authController.getSignup);
authRouter.post("/api/auth/signup", authController.postSignup);
authRouter.get("/api/auth/check-session", authController.checkSession);

// ── MOBILE API: JWT endpoints for HavenToApp (React Native) ──────────────────

// POST /api/auth/mobile/login
authRouter.post('/api/auth/mobile/login', async (req, res) => {
    try {
        const { normalizeEmail } = require('validator');
        const raw   = (req.body.email || '').trim();
        const email = normalizeEmail(raw) || raw.toLowerCase();
        const { password } = req.body;
        const bcrypt = require('bcryptjs');
        const User = require('../models/user');
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, error: 'No account found with that email.' });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ success: false, error: 'Incorrect password.' });
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: {
            _id: user._id, firstName: user.firstName, lastName: user.lastName || '',
            email: user.email, role: user.userType || 'guest',
            onboarded: true
        }});
    } catch (err) { res.status(500).json({ success: false, error: 'Server error.' }); }
});

// POST /api/auth/mobile/signup
authRouter.post('/api/auth/mobile/signup', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const User = require('../models/user');
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !email || !password) return res.status(400).json({ success: false, error: 'Missing required fields.' });
        if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ success: false, error: 'Account already exists with this email.' });
        const hashed = await bcrypt.hash(password, 12);
        const user = new User({
            firstName, lastName: lastName || '', email: email.toLowerCase(),
            password: hashed, authProvider: 'local', userType: 'guest'
        });
        await user.save();
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: {
            _id: user._id, firstName: user.firstName, lastName: user.lastName || '',
            email: user.email, role: 'guest', onboarded: true
        }});
    } catch (err) { res.status(500).json({ success: false, error: 'Could not create account.' }); }
});

// GET /api/auth/mobile/me  — verify token & return user
authRouter.get('/api/auth/mobile/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const User = require('../models/user');
        const user = await User.findOne({ _id: decoded.userId });
        if (!user) return res.status(401).json({ success: false });
        res.json({ success: true, user: {
            _id: user._id, firstName: user.firstName, lastName: user.lastName || '',
            email: user.email, role: user.userType || 'guest',
            onboarded: true
        }});
    } catch (err) { res.status(401).json({ success: false, error: 'Invalid token.' }); }
});

module.exports = authRouter;
