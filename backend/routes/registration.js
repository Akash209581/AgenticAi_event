import express from 'express';
import { User } from '../models/User.js';
import { generateAiId, memoryUsers } from '../utils/idGenerator.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper to validate email format
const isValidEmail = (email) => {
  return /^\S+@\S+\.\S+$/.test(email);
};

/**
 * POST /cseAI/register
 * Handles Agentic AI Day user registrations
 */
router.post('/register', async (req, res) => {
  try {
    const { name, dob, regNo, year, phone, email } = req.body;

    // 1. Mandatory Field Checks
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is a mandatory field' });
    }
    if (!dob || !dob.trim()) {
      return res.status(400).json({ success: false, message: 'Date of Birth (DOB) is a mandatory field' });
    }
    if (!regNo || !regNo.trim()) {
      return res.status(400).json({ success: false, message: 'Registration number is a mandatory field' });
    }
    if (!year || !['1', '2', '3', '4'].includes(String(year).trim())) {
      return res.status(400).json({ success: false, message: 'Year is a mandatory field (choose 1, 2, 3, or 4)' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is a mandatory field' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email Id is a mandatory field' });
    }

    // 2. Strict Phone Validation (strictly 10 numeric digits)
    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must consist of strictly 10 numerical digits'
      });
    }

    // 3. Email format validation
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Email address'
      });
    }

    const cleanName = name.trim();
    const cleanDob = dob.trim();
    const cleanRegNo = regNo.trim();

    // 4. Duplicate Checks (if DB is connected)
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({
        $or: [{ email: cleanEmail }, { regNo: cleanRegNo }]
      });

      if (existingUser) {
        if (existingUser.email === cleanEmail) {
          return res.status(400).json({
            success: false,
            message: `User with email '${cleanEmail}' is already registered (AI ID: ${existingUser.aiId}).`
          });
        }
        if (existingUser.regNo === cleanRegNo) {
          return res.status(400).json({
            success: false,
            message: `Registration number '${cleanRegNo}' is already registered (AI ID: ${existingUser.aiId}).`
          });
        }
      }
    } else {
      // In-memory check
      const existingMem = memoryUsers.find(u => u.email === cleanEmail || u.regNo === cleanRegNo);
      if (existingMem) {
        return res.status(400).json({
          success: false,
          message: `User with email or registration number is already registered (AI ID: ${existingMem.aiId}).`
        });
      }
    }

    // 5. Generate AI ID with retry mechanism (ID starts at AI00001)
    const MAX_RETRIES = 3;
    let newRegistration = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const aiId = await generateAiId();
        
        // Password is strictly set to user's DOB
        const password = cleanDob;

        const cleanYear = String(year).trim();

        if (mongoose.connection.readyState === 1) {
          newRegistration = new User({
            aiId,
            name: cleanName,
            dob: cleanDob,
            regNo: cleanRegNo,
            year: cleanYear,
            phone: cleanPhone,
            email: cleanEmail,
            password
          });
          await newRegistration.save();
        } else {
          // Fallback save to memory array
          newRegistration = {
            aiId,
            name: cleanName,
            dob: cleanDob,
            regNo: cleanRegNo,
            year: cleanYear,
            phone: cleanPhone,
            email: cleanEmail,
            password,
            createdAt: new Date()
          };
          memoryUsers.push(newRegistration);
        }
        break; // Success! Break out of retry loop
      } catch (error) {
        if (error.code === 11000 && attempt < MAX_RETRIES) {
          console.warn(`[Collision Retry] Duplicate AI ID collision on attempt ${attempt}, retrying...`);
          continue;
        }
        throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your AI Day Digital Pass has been generated.',
      user: {
        aiId: newRegistration.aiId,
        name: newRegistration.name,
        dob: newRegistration.dob,
        regNo: newRegistration.regNo,
        year: newRegistration.year,
        phone: newRegistration.phone,
        email: newRegistration.email,
        createdAt: newRegistration.createdAt
      }
    });

  } catch (error) {
    console.error('[Registration Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during registration.'
    });
  }
});

/**
 * GET /cseAI/registrations
 * Retrieve list of registered attendees (Admin view)
 */
router.get('/registrations', async (req, res) => {
  try {
    const { search } = req.query;
    let users = [];

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        query = {
          $or: [
            { name: regex },
            { aiId: regex },
            { regNo: regex },
            { email: regex },
            { phone: regex }
          ]
        };
      }
      users = await User.find(query).select('-password').sort({ createdAt: -1 });
    } else {
      users = memoryUsers.map(({ password, ...u }) => u);
      if (search) {
        const term = search.trim().toLowerCase();
        users = users.filter(u =>
          u.name.toLowerCase().includes(term) ||
          u.aiId.toLowerCase().includes(term) ||
          u.regNo.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.phone.includes(term)
        );
      }
    }

    return res.json({
      success: true,
      count: users.length,
      registrations: users
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /cseAI/stats
 * Event stats & dashboard metrics
 */
router.get('/stats', async (req, res) => {
  try {
    let totalCount = 0;
    if (mongoose.connection.readyState === 1) {
      totalCount = await User.countDocuments();
    } else {
      totalCount = memoryUsers.length;
    }

    return res.json({
      success: true,
      stats: {
        totalRegistrations: totalCount,
        eventName: 'Agentic AI Day 2026',
        idPrefix: 'AI',
        startId: 'AI00001'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
