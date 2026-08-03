const path = require('path');
const fs = require('fs');
require('dotenv').config();

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { default: mongoose } = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const DB_PATH = process.env.MONGODB_URI || "mongodb://localhost:27017/havento";

const storeRouter = require("./routes/storeRouter")
const hostRouter = require("./routes/hostRouter")
const authRouter = require("./routes/authRouter")
const passwordResetRouter = require("./routes/passwordResetRoutes")
const emailVerificationRouter = require("./routes/emailVerificationRoutes") 
const rootDir = require("./utils/pathUtil");
const errorsController = require("./controllers/errors");
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust proxy - required for Render deployment
app.set('trust proxy', 1);


app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:5175',
  'https://havento.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // Allow all Vercel deployments
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const store = MongoStore.create({
  mongoUrl: DB_PATH,
  collectionName: 'sessions'
});

const randomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// GridFS: use memory storage — files are held in RAM briefly, then streamed into MongoDB
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log('Incoming file:', file.originalname, 'mimetype:', file.mimetype);
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed. Received: ' + file.mimetype));
  }
}

const multerOptions = {
  storage, fileFilter
};

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(multer(multerOptions).array('photos', 5)); 
app.use(express.static(path.join(rootDir, 'public')));

// ── GridFS image retrieval with static fallback ──────────────────────────────
app.get('/uploads/:fileId', async (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  try {
    if (!app.locals.gfsBucket) {
      return next();
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.fileId)) {
      return next();
    }
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const files = await mongoose.connection.db.collection('photos.files').findOne({ _id: fileId });
    if (!files) {
      return next();
    }
    res.set('Content-Type', files.contentType || 'image/jpeg');
    const downloadStream = app.locals.gfsBucket.openDownloadStream(fileId);
    downloadStream.on('error', () => next());
    downloadStream.pipe(res);
  } catch (err) {
    console.error('GridFS retrieval error:', err);
    next();
  }
});

app.use("/uploads", (req, res, next) => { res.set('Cross-Origin-Resource-Policy', 'cross-origin'); next(); }, express.static(path.join(rootDir, 'uploads')));
app.use("/host/uploads", express.static(path.join(rootDir, 'uploads')))
app.use("/homes/uploads", express.static(path.join(rootDir, 'uploads')))

app.use(session({
  secret: process.env.SESSION_SECRET || "KnowledgeGate AI with Complete Coding",
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' for cross-origin
  }
}));



app.use((req, res, next) => {
  req.isLoggedIn = req.session.isLoggedIn
  next();
})

app.use('/api/', apiLimiter);

app.use(authRouter);
app.use('/api/password-reset', passwordResetRouter);
app.use('/api/verify-email', emailVerificationRouter);
 
app.use(storeRouter);
app.use(hostRouter);

app.use(errorsController.pageNotFound);

const PORT = process.env.PORT || 3009;

let gfsBucket;

mongoose.connect(DB_PATH).then(() => {
  console.log('Connected to Mongo');
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'photos' });
  app.locals.gfsBucket = gfsBucket;
  app.listen(PORT, () => {
    console.log(`Server running on address http://localhost:${PORT}`);
  });
}).catch(err => {
  console.log('Error while connecting to Mongo: ', err);
});
