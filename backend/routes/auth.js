import express from 'express';
import { User } from '../models/User.js';
import { memoryUsers } from '../utils/idGenerator.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * POST /cseAI/login
 * Login route using Email/RegNo/AI ID and DOB as password
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, message: 'Email, Registration Number, or AI ID is required' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Password (DOB) is required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { email: cleanId },
          { regNo: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { aiId: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanId ||
             u.regNo.toLowerCase() === cleanId ||
             u.aiId.toLowerCase() === cleanId
      );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registration record found matching the provided details.'
      });
    }

    // Verify Password matches DOB
    if (user.password !== cleanPassword && user.dob !== cleanPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Note: Password is set to your Date of Birth (DOB).'
      });
    }

    return res.json({
      success: true,
      message: 'Login successful!',
      user: {
        aiId: user.aiId,
        name: user.name,
        dob: user.dob,
        regNo: user.regNo,
        year: user.year,
        phone: user.phone,
        email: user.email,
        registeredEvents: user.registeredEvents || [],
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('[Auth Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server authentication error' });
  }
});

/**
 * POST /cseAI/enroll-event
 * Enrolls a user into a specific event
 */
router.post('/enroll-event', async (req, res) => {
  try {
    const { identifier, event } = req.body;

    if (!identifier || !event || !event.title) {
      return res.status(400).json({ success: false, message: 'Identifier and valid event data are required.' });
    }

    const cleanId = identifier.trim().toLowerCase();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { email: cleanId },
          { regNo: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { aiId: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanId ||
             u.regNo.toLowerCase() === cleanId ||
             u.aiId.toLowerCase() === cleanId
      );
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    // Initialize registeredEvents if undefined
    if (!user.registeredEvents) {
      user.registeredEvents = [];
    }

    // Check if already enrolled
    const exists = user.registeredEvents.some(e => e.id === event.id || e.title === event.title);
    if (!exists) {
      const newEventEntry = {
        id: event.id,
        title: event.title,
        categoryName: event.categoryName || event.category || 'TECHNICAL EVENTS',
        categoryId: event.categoryId || 'technical',
        image: event.image || '',
        registeredAt: new Date().toISOString()
      };

      user.registeredEvents.push(newEventEntry);

      if (mongoose.connection.readyState === 1) {
        await user.save();
      }
    }

    return res.json({
      success: true,
      message: `Enrolled successfully in ${event.title}`,
      registeredEvents: user.registeredEvents
    });

  } catch (error) {
    console.error('[Enrollment Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during event enrollment' });
  }
});

/**
 * POST /cseAI/unenroll-event
 * Removes an event from user's registeredEvents array
 */
router.post('/unenroll-event', async (req, res) => {
  try {
    const { identifier, eventId, eventTitle } = req.body;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'User identifier is required.' });
    }

    const cleanId = identifier.trim().toLowerCase();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { email: cleanId },
          { regNo: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { aiId: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanId ||
             u.regNo.toLowerCase() === cleanId ||
             u.aiId.toLowerCase() === cleanId
      );
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    if (user.registeredEvents) {
      user.registeredEvents = user.registeredEvents.filter(e => {
        if (eventId && e.id === eventId) return false;
        if (eventTitle && e.title.toLowerCase() === eventTitle.toLowerCase()) return false;
        return true;
      });

      if (mongoose.connection.readyState === 1) {
        await user.save();
      }
    }

    return res.json({
      success: true,
      message: 'Event registration cancelled successfully.',
      registeredEvents: user.registeredEvents || []
    });

  } catch (error) {
    console.error('[Unenrollment Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during event unenrollment' });
  }
});

export default router;
