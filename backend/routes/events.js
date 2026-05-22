import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authMiddleware, adminMiddleware, adminOrAlumniMiddleware } from '../middleware/auth.js';
import { getIO, getSocketIdByUserId } from '../sockets/chat.js';

const router = express.Router();

// Get all events
router.get('/', authMiddleware, async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email role')
      .populate('registrations', 'name email role profile')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching events' });
  }
});

// Get event by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('registrations', 'name email role profile');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching event details' });
  }
});

// Admin / Alumni: Create Event
router.post('/', authMiddleware, adminOrAlumniMiddleware, async (req, res) => {
  try {
    const { title, description, type, date, location, poster, speaker } = req.body;

    if (!title || !description || !type || !date || !location) {
      return res.status(400).json({ message: 'Please provide all required event details' });
    }

    const newEvent = new Event({
      title,
      description,
      type,
      date,
      location,
      poster: poster || '',
      speaker: speaker || '',
      createdBy: req.user.id
    });

    await newEvent.save();
    
    const populatedEvent = await Event.findById(newEvent._id)
      .populate('createdBy', 'name email role');

    // Create and dispatch notifications for all student users
    try {
      const students = await User.find({ role: 'student' });
      if (students.length > 0) {
        const notifData = students.map(student => ({
          recipient: student._id,
          sender: req.user.id,
          type: 'event',
          text: `posted a new event: "${title}"`,
          isRead: false
        }));

        const savedNotifs = await Notification.insertMany(notifData);
        
        const io = getIO();
        if (io) {
          for (const notif of savedNotifs) {
            const socketId = getSocketIdByUserId(notif.recipient.toString());
            if (socketId) {
              const populatedNotif = await Notification.findById(notif._id)
                .populate('sender', 'name email role profile');
              io.to(socketId).emit('new_notification', populatedNotif);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error dispatching student notifications for event:', err);
    }

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error creating event' });
  }
});

// Register / Unregister for Event
router.post('/register/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const regIdx = event.registrations.indexOf(req.user.id);
    let registered = false;

    if (regIdx > -1) {
      // Unregister
      event.registrations.splice(regIdx, 1);
    } else {
      // Register
      event.registrations.push(req.user.id);
      registered = true;
    }

    await event.save();
    res.json({ registered, registrations: event.registrations });
  } catch (error) {
    res.status(500).json({ message: 'Server error toggling event registration' });
  }
});

// Admin: Add Announcement to Event
router.post('/announcement/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Announcement text is required' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.announcements.push(text);
    await event.save();

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding announcement' });
  }
});

// Admin: Delete Event
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting event' });
  }
});

export default router;
