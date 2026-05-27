import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import messageRoutes from './routes/messages.js';
import eventRoutes from './routes/events.js';
import chatbotRoutes from './routes/chatbot.js';
import notificationRoutes from './routes/notifications.js';
import connectionRoutes from './routes/connections.js';

// Import socket handler
import { initSocketHandler } from './sockets/chat.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev/production simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Security Middlewares
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs in production
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Support base64 image and video uploads, limited to 10MB to prevent abuse
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

// Temporary startup log
console.log('Active MongoDB URI Source:', MONGO_URI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local/Other');

mongoose.connect(MONGO_URI, { family: 4 })
  .then(() => {
    console.log('Successfully connected to MongoDB Database');
    if (mongoose.connection.host.includes('mongodb.net')) {
      console.log('CONFIRMED: Atlas Connection Established successfully!');
    }
  })
  .catch(err => {
    console.error('MongoDB database connection error:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/connections', connectionRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Maatram Alumni Connect API running smoothly' });
});

// Initialize Socket.io Chat Events
initSocketHandler(io);

// Global Error Handler for Production Safety
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
