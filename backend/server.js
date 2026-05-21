import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

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

// Middlewares
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Support base64 image and video uploads
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/maatram_alumni_connect';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Database'))
  .catch(err => {
    console.error('MongoDB database connection error:', err);
    console.log('Falling back to memory DB or local db instance. Ensure MongoDB is running locally.');
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

// Server port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
