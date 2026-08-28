import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { generateAiId, memoryUsers } from '../utils/idGenerator.js';
import { requireAdminAuth, getAdminSecretToken, generateUserJwt, verifyJwtToken } from '../middleware/adminAuth.js';
import mongoose from 'mongoose';
import { BACKUP_DB_DIR, BACKUP_POSTERS_DIR, BACKUP_DIR } from '../config/paths.js';
import { isEventRegistrationClosed, isGeneralRegistrationClosed } from '../utils/deadlineValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

export const memoryTeams = [];

const EVENT_CONSTRAINTS = {
  'technical-1': { min: 4, max: 5, name: 'AGENTIC AI HACKATHON' },
  'technical-2': { min: 2, max: 3, name: 'AI PROMPT COMBAT' },
  'technical-3': { min: 1, max: 3, name: 'PAPER / POSTER PRESENTATION' },
  'industry-2': { min: 2, max: 4, name: 'AI AGENTS EXPO' },
  'creative-3': { min: 3, max: 5, name: 'AGENTIC DAY QUIZ CHALLENGE 2026' },
  'creative-2': { min: 1, max: 3, name: 'AI MUSICAL COMPETITION' },
  'creative-1': { min: 1, max: 3, name: 'REELS COMPETITION (AI FOR SOCIETY)' },
  'creative-4': { min: 5, max: 5, name: 'QUESTX' },
  'innovative-1': { min: 2, max: 3, name: 'SPARKX' }
};


/**
 * POST /cseAI/admin-login
 * Authentication endpoint for Admin Portal (/Iamadmin)
 */
router.post('/admin-login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and Password are required' });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Valid admin credentials check (Environment configurable)
    const allowedUsers = (process.env.ADMIN_USERNAME || 'admin,cseadmin').toLowerCase().split(',').map(u => u.trim());
    const allowedPasswords = process.env.ADMIN_PASSWORD
      ? [process.env.ADMIN_PASSWORD]
      : ['admin', 'admin123', 'vucse2026'];

    const isValidAdmin = allowedUsers.includes(cleanUser) && allowedPasswords.includes(cleanPass);

    if (!isValidAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin Credentials.'
      });
    }

    const token = getAdminSecretToken();

    return res.json({
      success: true,
      message: 'Admin Authentication Successful!',
      token,
      admin: {
        username: cleanUser,
        role: 'SUPER_ADMIN',
        authenticatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server authentication error' });
  }
});

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
    if (isGeneralRegistrationClosed()) {
      return res.status(400).json({
        success: false,
        message: 'Registrations for Agentic AI Day 2026 have officially closed (deadline passed).'
      });
    }

    const { name, dob, regNo, year, gender, phone, email } = req.body;

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
    const validYears = ['1', '2', '3', '4', 'M.Tech (1st year)', 'M.Tech (2nd year)'];
    if (!year || !validYears.includes(String(year).trim())) {
      return res.status(400).json({ success: false, message: 'Year is a mandatory field (choose 1, 2, 3, 4, M.Tech (1st year), or M.Tech (2nd year))' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is a mandatory field' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email Id is a mandatory field' });
    }

    // Clean Gender
    const validGenders = ['Male', 'Female', 'Other'];
    const cleanGender = (gender && validGenders.includes(gender.trim())) ? gender.trim() : 'Male';

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
    // Uppercase so all queries are exact-match on the indexed field (no regex needed)
    const cleanRegNo = regNo.trim().toUpperCase();

    // 4. Duplicate Checks (if DB is connected)
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({
        $or: [{ email: cleanEmail }, { regNo: cleanRegNo }, { phone: cleanPhone }]
      });

      if (existingUser) {
        if (existingUser.regNo === cleanRegNo) {
          return res.status(400).json({
            success: false,
            message: 'This Registration Number is already registered.'
          });
        }
        if (existingUser.email === cleanEmail) {
          return res.status(400).json({
            success: false,
            message: 'This Email address is already registered.'
          });
        }
        if (existingUser.phone === cleanPhone) {
          return res.status(400).json({
            success: false,
            message: 'This Phone number is already registered.'
          });
        }
      }
    } else {
      // In-memory check
      const existingMem = memoryUsers.find(
        u => u.email === cleanEmail || u.regNo === cleanRegNo || u.phone === cleanPhone
      );
      if (existingMem) {
        if (existingMem.regNo === cleanRegNo) {
          return res.status(400).json({
            success: false,
            message: 'This Registration Number is already registered.'
          });
        }
        if (existingMem.email === cleanEmail) {
          return res.status(400).json({
            success: false,
            message: 'This Email address is already registered.'
          });
        }
        if (existingMem.phone === cleanPhone) {
          return res.status(400).json({
            success: false,
            message: 'This Phone number is already registered.'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'The provided registration details are already registered.'
        });
      }
    }

    // 5. Generate VUCSE ID with retry mechanism (ID starts at VUCSE00001)
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
            gender: cleanGender,
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
            gender: cleanGender,
            phone: cleanPhone,
            email: cleanEmail,
            password,
            registeredEvents: [],
            createdAt: new Date()
          };
          memoryUsers.push(newRegistration);
        }
        break; // Success! Break out of retry loop
      } catch (error) {
        if (error.code === 11000) {
          const keyPattern = error.keyPattern || error.keyValue || {};
          const errStr = JSON.stringify(keyPattern).toLowerCase();
          if (errStr.includes('regno') || error.message?.includes('regNo')) {
            return res.status(400).json({
              success: false,
              message: 'This Registration Number is already registered.'
            });
          }
          if (errStr.includes('email') || error.message?.includes('email')) {
            return res.status(400).json({
              success: false,
              message: 'This Email address is already registered.'
            });
          }
          if (errStr.includes('phone') || error.message?.includes('phone')) {
            return res.status(400).json({
              success: false,
              message: 'This Phone number is already registered.'
            });
          }
          if (attempt < MAX_RETRIES) {
            console.warn(`[Collision Retry] Duplicate AI ID collision on attempt ${attempt}, retrying...`);
            continue;
          }
        }
        throw error;
      }
    }

    const token = generateUserJwt(newRegistration);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your AI Day Digital Pass has been generated.',
      token,
      user: {
        aiId: newRegistration.aiId,
        name: newRegistration.name,
        dob: newRegistration.dob,
        regNo: newRegistration.regNo,
        year: newRegistration.year,
        gender: newRegistration.gender,
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
 * Retrieve list of registered attendees with filters (Admin view)
 * Supports query params: search, year, gender, event
 */
router.get('/registrations', requireAdminAuth, async (req, res) => {
  try {
    const { search, year, gender, event } = req.query;
    let users = [];

    if (mongoose.connection.readyState === 1) {
      const query = {};

      if (year && year !== 'all') {
        const yStr = String(year).trim();
        if (yStr.toLowerCase() === 'mtech') {
          query.year = new RegExp('m\\.?tech', 'i');
        } else if (yStr.toLowerCase().includes('m.tech') || yStr.toLowerCase().includes('mtech')) {
          query.year = new RegExp(yStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        } else {
          query.year = yStr;
        }
      }

      if (gender && gender !== 'all') {
        query.gender = String(gender).trim();
      }

      if (event && event !== 'all') {
        const cleanEvent = String(event).trim();
        query.$or = [
          { 'registeredEvents.id': cleanEvent },
          { 'registeredEvents.title': new RegExp(cleanEvent, 'i') }
        ];
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        const searchConditions = [
          { name: regex },
          { aiId: regex },
          { regNo: regex },
          { email: regex },
          { phone: regex }
        ];

        if (query.$or) {
          // Combine event filter with search filter using $and
          const eventConditions = query.$or;
          delete query.$or;
          query.$and = [
            { $or: eventConditions },
            { $or: searchConditions }
          ];
        } else {
          query.$or = searchConditions;
        }
      }

      const HEAVY_FILE_PROJECTION = '-password -registeredEvents.submission.posterFile.fileData -registeredEvents.submission.paperFile.fileData -registeredEvents.submission.resubmissionHistory.posterFile.fileData -registeredEvents.submission.resubmissionHistory.paperFile.fileData';
      users = await User.find(query).select(HEAVY_FILE_PROJECTION).sort({ createdAt: -1 }).lean();
    } else {
      users = memoryUsers.map(({ password, ...u }) => u);

      if (year && year !== 'all') {
        const yStr = String(year).trim().toLowerCase();
        users = users.filter(u => {
          const uYear = String(u.year || '').trim().toLowerCase();
          if (yStr === 'mtech') {
            return uYear.includes('m.tech') || uYear.includes('mtech');
          }
          if (yStr.includes('m.tech')) {
            return uYear.includes(yStr) || uYear.includes(yStr.replace('m.tech', 'mtech'));
          }
          return uYear === yStr;
        });
      }

      if (gender && gender !== 'all') {
        users = users.filter(u => String(u.gender || 'Unspecified') === String(gender).trim());
      }

      if (event && event !== 'all') {
        const cleanEvent = String(event).trim().toLowerCase();
        users = users.filter(u =>
          (u.registeredEvents || []).some(e =>
            String(e.id) === cleanEvent ||
            (e.title && e.title.toLowerCase().includes(cleanEvent))
          )
        );
      }

      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        users = users.filter(u =>
          (u.name && u.name.toLowerCase().includes(term)) ||
          (u.aiId && u.aiId.toLowerCase().includes(term)) ||
          (u.regNo && u.regNo.toLowerCase().includes(term)) ||
          (u.email && u.email.toLowerCase().includes(term)) ||
          (u.phone && u.phone.includes(term))
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
 * Event stats & dashboard metrics breakdown (Admin protected)
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    let allUsers = [];

    if (mongoose.connection.readyState === 1) {
      allUsers = await User.find().select('year gender registeredEvents.id registeredEvents.title').lean();
    } else {
      allUsers = memoryUsers;
    }

    const totalCount = allUsers.length;

    const yearStats = { '1': 0, '2': 0, '3': 0, '4': 0, 'M.Tech (1st year)': 0, 'M.Tech (2nd year)': 0 };

    const genderStats = { 'Male': 0, 'Female': 0, 'Other': 0, 'Unspecified': 0 };
    const eventStatsMap = {};

    allUsers.forEach(u => {
      // Year breakdown
      if (u.year && yearStats[u.year] !== undefined) {
        yearStats[u.year]++;
      }

      // Gender breakdown
      const g = u.gender || 'Unspecified';
      if (genderStats[g] !== undefined) {
        genderStats[g]++;
      } else {
        genderStats['Unspecified']++;
      }

      // Event breakdown
      if (Array.isArray(u.registeredEvents)) {
        u.registeredEvents.forEach(e => {
          const key = e.title || e.id || 'Unknown Event';
          if (!eventStatsMap[key]) {
            eventStatsMap[key] = {
              id: e.id,
              title: e.title || key,
              categoryName: e.categoryName || 'TECHNICAL EVENTS',
              count: 0
            };
          }
          eventStatsMap[key].count++;
        });
      }
    });

    return res.json({
      success: true,
      stats: {
        totalRegistrations: totalCount,
        yearStats,
        genderStats,
        eventStats: Object.values(eventStatsMap),
        eventName: 'Agentic AI Day 2026',
        idPrefix: 'VUCSE',
        startId: 'VUCSE00001'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const isUserRegisteredForEvent = (user, eventId, eventTitle) => {
  if (!user || !Array.isArray(user.registeredEvents)) return false;
  if (user.registeredEvents.length === 0) return false;

  const cleanId = String(eventId || '').toLowerCase().trim();
  const cleanTitle = String(eventTitle || '').toLowerCase().trim();

  return user.registeredEvents.some(e => {
    const eId = String(e.id || '').toLowerCase().trim();
    const eTitle = String(e.title || '').toLowerCase().trim();

    if (eId && cleanId && (eId === cleanId || eId.includes(cleanId) || cleanId.includes(eId))) {
      return true;
    }
    if (eTitle && cleanTitle && (eTitle === cleanTitle || eTitle.includes(cleanTitle) || cleanTitle.includes(eTitle))) {
      return true;
    }

    const keywords = ['hackathon', 'prompt', 'paper', 'poster', 'expo', 'quiz', 'musical', 'bootcamp'];
    for (const kw of keywords) {
      if ((cleanTitle.includes(kw) || cleanId.includes(kw)) && (eTitle.includes(kw) || eId.includes(kw))) {
        return true;
      }
    }

    return false;
  });
};

/**
 * GET /cseAI/student/:identifier
 * Lookup a registered student's details by AI ID, Reg No, or Email
 * Optionally checks if student is enrolled in a specific event via query params ?eventId=...&eventTitle=...
 */
router.get('/student/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { eventId, eventTitle } = req.query;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, message: 'Student AI ID, Reg No, or Email is required.' });
    }

    const cleanIdLower = identifier.trim().toLowerCase();
    const cleanIdUpper = identifier.trim().toUpperCase();
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { aiId: cleanIdUpper },
          { regNo: cleanIdUpper },
          { email: cleanIdLower }
        ]
      }).select('-password');
    } else {
      user = memoryUsers.find(
        u => (u.aiId && u.aiId.toUpperCase() === cleanIdUpper) ||
             (u.regNo && u.regNo.toUpperCase() === cleanIdUpper) ||
             (u.email && u.email.toLowerCase() === cleanIdLower)
      );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No registered student found matching ID/Email '${identifier}'. Please ensure the student is registered first.`
      });
    }

    const isEnrolledInEvent = (eventId || eventTitle)
      ? isUserRegisteredForEvent(user, eventId, eventTitle)
      : true;

    let hasSubmittedEvent = false;
    if (user.registeredEvents && (eventId || eventTitle)) {
      const match = user.registeredEvents.find(e => {
        const eId = String(e.id || '').trim().toLowerCase();
        const eTitle = String(e.title || '').trim().toLowerCase();
        const cleanEventId = String(eventId || '').trim().toLowerCase();
        const cleanEventTitle = String(eventTitle || '').trim().toLowerCase();
        
        if (cleanEventId && eId === cleanEventId) return true;
        if (cleanEventTitle && eTitle === cleanEventTitle) return true;
        if (cleanEventTitle && (eTitle.includes(cleanEventTitle) || cleanEventTitle.includes(eTitle))) return true;
        
        const keywords = ['hackathon', 'prompt', 'paper', 'poster', 'expo', 'quiz', 'musical', 'bootcamp'];
        for (const kw of keywords) {
          if ((cleanEventTitle.includes(kw) || cleanEventId.includes(kw)) && (eTitle.includes(kw) || eId.includes(kw))) {
            return true;
          }
        }
        return false;
      });
      if (match && match.submission && (match.submission.reelLink || match.submission.posterFile || match.submission.posterLink)) {
        hasSubmittedEvent = true;
      }
    }

    return res.json({
      success: true,
      student: {
        aiId: user.aiId,
        name: user.name,
        regNo: user.regNo,
        year: user.year,
        email: user.email || '',
        phone: user.phone || '',
        registeredEvents: user.registeredEvents || []
      },
      isEnrolledInEvent,
      hasSubmittedEvent
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server lookup error' });
  }
});


// Helper to verify if an incoming request has valid admin credentials
const checkIsAdminRequest = (req) => {
  try {
    const rawHeader = req.headers['x-admin-token'] || req.headers['authorization'] || req.query?.adminToken;
    if (!rawHeader) return false;
    const token = rawHeader.startsWith('Bearer ') ? rawHeader.substring(7) : rawHeader;
    const decoded = verifyJwtToken(token);
    if (decoded && decoded.role === 'SUPER_ADMIN') return true;
    const legacyToken = getAdminSecretToken();
    if (token === legacyToken) return true;
    return false;
  } catch (_) {
    return false;
  }
};

/**
 * POST /cseAI/team-register
 * Handles team registration for event with strict team size & single-team constraints
 */
router.post('/team-register', async (req, res) => {
  try {
    const { teamName, eventId, eventTitle, members, currentUserAiId } = req.body;
    const isAdmin = checkIsAdminRequest(req);

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team Name is a mandatory field.' });
    }
    if (!eventId || !eventId.trim()) {
      return res.status(400).json({ success: false, message: 'Event selection is required.' });
    }
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Team must have at least 1 member.' });
    }

    // Ensure Member #1 (Team Leader) is the registering user's own AI ID if currentUserAiId is supplied and not admin
    if (!isAdmin && currentUserAiId && currentUserAiId.trim()) {
      const leaderId = (members[0]?.aiId || '').trim().toUpperCase();
      const expectedId = currentUserAiId.trim().toUpperCase();
      if (leaderId !== expectedId) {
        return res.status(400).json({
          success: false,
          message: `Access Error: As the logged-in user, Member #1 (Team Leader) must be your own AI ID (${expectedId}). You cannot register a team using another student's ID.`
        });
      }
    }

    const cleanTeamName = teamName.trim();
    const cleanEventId = eventId.trim();
    const cleanEventTitle = (eventTitle || '').trim() || cleanEventId;

    if (!isAdmin && isEventRegistrationClosed(cleanEventId, cleanEventTitle)) {
      return res.status(400).json({
        success: false,
        message: `Registration for ${cleanEventTitle || 'this event'} has closed (deadline passed).`
      });
    }


    // 1. Verify Event Constraint (Min and Max team size)
    const constraint = EVENT_CONSTRAINTS[cleanEventId] || { min: 1, max: 5, name: cleanEventTitle };
    if (!isAdmin && (members.length < constraint.min || members.length > constraint.max)) {
      return res.status(400).json({
        success: false,
        message: `Team size violation for '${constraint.name}': Required ${constraint.min === constraint.max ? constraint.min : `${constraint.min} to ${constraint.max}`} members, but ${members.length} members provided.`
      });
    }

    // 2. Validate member details and check duplicates within the team submission
    const seenAiIds = new Set();
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.aiId || !m.aiId.trim()) {
        return res.status(400).json({ success: false, message: `Member #${i + 1} AI ID is missing.` });
      }
      const upperId = m.aiId.trim().toUpperCase();
      if (seenAiIds.has(upperId)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate student '${upperId}' in team submission. A student cannot be listed twice in the same team.`
        });
      }
      seenAiIds.add(upperId);
    }

    // 3. Event Registration Eligibility Check: Ensure every member is registered for this event
    for (const m of members) {
      const targetAiId = m.aiId.trim().toUpperCase();
      let userRecord = null;

      if (mongoose.connection.readyState === 1) {
        userRecord = await User.findOne({ aiId: targetAiId });
      } else {
        userRecord = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === targetAiId);
      }

      if (!userRecord) {
        return res.status(400).json({
          success: false,
          message: `Eligibility Error: Student '${m.name || targetAiId}' (${targetAiId}) is not registered in the system.`
        });
      }

      const isRegisteredForEvent = isUserRegisteredForEvent(userRecord, cleanEventId, cleanEventTitle);
      if (!isRegisteredForEvent) {
        return res.status(400).json({
          success: false,
          message: `Eligibility Error: Student '${userRecord.name}' (${targetAiId}) has NOT registered for '${cleanEventTitle}'. Only students who are registered for this event are eligible to form or join a team!`
        });
      }

      // Check if user has already submitted content for this event
      if (userRecord.registeredEvents) {
        const matchingEnrollment = userRecord.registeredEvents.find(e => {
          const eId = String(e.id || '').trim().toLowerCase();
          const eTitle = String(e.title || '').trim().toLowerCase();
          return (cleanEventId && eId === cleanEventId.toLowerCase()) || 
                 (cleanEventTitle && eTitle === cleanEventTitle.toLowerCase());
        });
        
        if (matchingEnrollment && matchingEnrollment.submission && (matchingEnrollment.submission.reelLink || matchingEnrollment.submission.posterFile || matchingEnrollment.submission.posterLink)) {
          return res.status(400).json({
            success: false,
            message: `Eligibility Error: Student '${userRecord.name}' (${targetAiId}) has already submitted the work/poster for '${cleanEventTitle}'. Team registration is disabled for students who have already submitted!`
          });
        }
      }
    }

    // 4. Single Team per Event Constraint: Ensure no student is already in another team for this event
    let existingTeams = [];
    if (mongoose.connection.readyState === 1) {
      existingTeams = await Team.find({ eventId: cleanEventId });
    } else {
      existingTeams = memoryTeams.filter(
        t => t.eventId === cleanEventId || (t.eventTitle && t.eventTitle.toLowerCase() === cleanEventTitle.toLowerCase())
      );
    }

    for (const m of members) {
      const targetAiId = m.aiId.trim().toUpperCase();
      const conflictingTeam = existingTeams.find(team =>
        team.members.some(mem => mem.aiId.trim().toUpperCase() === targetAiId)
      );

      if (conflictingTeam) {
        return res.status(400).json({
          success: false,
          message: `Constraint Error: Student '${m.name || targetAiId}' (${targetAiId}) is already registered in team '${conflictingTeam.teamName}' for ${cleanEventTitle}. A student can only be in ONE team per event!`
        });
      }
    }


    // 4. Generate Team ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const teamId = `TEAM-${cleanEventId.toUpperCase()}-${randomCode}`;

    const leaderMember = members[0];
    const formattedMembers = members.map((m, idx) => ({
      aiId: m.aiId.trim().toUpperCase(),
      name: (m.name || '').trim(),
      regNo: (m.regNo || '').trim(),
      year: String(m.year || '').trim(),
      email: (m.email || '').trim().toLowerCase(),
      phone: (m.phone || '').trim(),
      isLeader: idx === 0
    }));

    let savedTeam = null;
    if (mongoose.connection.readyState === 1) {
      savedTeam = new Team({
        teamId,
        teamName: cleanTeamName,
        eventId: cleanEventId,
        eventTitle: cleanEventTitle,
        leaderAiId: leaderMember.aiId.trim().toUpperCase(),
        members: formattedMembers
      });
      await savedTeam.save();
    } else {
      savedTeam = {
        teamId,
        teamName: cleanTeamName,
        eventId: cleanEventId,
        eventTitle: cleanEventTitle,
        leaderAiId: leaderMember.aiId.trim().toUpperCase(),
        members: formattedMembers,
        createdAt: new Date()
      };
      memoryTeams.push(savedTeam);
    }

    // 5. Update each member's registeredEvents profile
    for (const m of formattedMembers) {
      try {
        const memberIsLeader = !!m.isLeader;
        if (mongoose.connection.readyState === 1) {
          // Use updateOne with $push instead of $addToSet so we can include isLeader field
          // First remove any stale entry for the same event, then re-add with full data
          await User.updateOne(
            { aiId: m.aiId },
            { $pull: { registeredEvents: { id: cleanEventId } } }
          );
          await User.updateOne(
            { aiId: m.aiId },
            {
              $push: {
                registeredEvents: {
                  id: cleanEventId,
                  title: cleanEventTitle,
                  categoryName: constraint.name || 'TEAM EVENT',
                  categoryId: 'team',
                  teamId: teamId,
                  teamName: cleanTeamName,
                  isTeam: true,
                  isLeader: memberIsLeader,
                  registeredAt: new Date().toISOString()
                }
              }
            }
          );
        } else {
          const userMem = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === m.aiId);
          if (userMem) {
            if (!userMem.registeredEvents) userMem.registeredEvents = [];
            userMem.registeredEvents = userMem.registeredEvents.filter(e => e.id !== cleanEventId && e.title !== cleanEventTitle);
            userMem.registeredEvents.push({
              id: cleanEventId,
              title: cleanEventTitle,
              categoryName: constraint.name || 'TEAM EVENT',
              categoryId: 'team',
              teamId: teamId,
              teamName: cleanTeamName,
              isTeam: true,
              isLeader: memberIsLeader,
              registeredAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.warn(`[User Event Sync Warning] Could not update registeredEvents for ${m.aiId}:`, err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Team '${cleanTeamName}' successfully registered for ${cleanEventTitle}!`,
      team: savedTeam
    });

  } catch (error) {
    console.error('[Team Registration Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during team registration.'
    });
  }
});

/**
 * POST /cseAI/admin/register-team
 * Dedicated administrative team registration endpoint.
 * Bypasses event deadlines and leader constraints, and automatically enrolls members in the event.
 */
router.post('/admin/register-team', requireAdminAuth, async (req, res) => {
  try {
    const { teamName, eventId, eventTitle, members, projectDetails, autoEnrollMembers = true } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team Name is a mandatory field.' });
    }
    if (!eventId || !eventId.trim()) {
      return res.status(400).json({ success: false, message: 'Event selection is required.' });
    }
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Team must contain at least 1 member.' });
    }

    const cleanTeamName = teamName.trim();
    const cleanEventId = eventId.trim();
    const constraint = EVENT_CONSTRAINTS[cleanEventId] || { min: 1, max: 10, name: cleanEventId };
    const cleanEventTitle = (eventTitle || '').trim() || constraint.name || cleanEventId;

    // Process and resolve all members
    const processedMembers = [];
    const seenAiIds = new Set();

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const identifier = (m.aiId || m.regNo || m.email || '').trim();
      let userRecord = null;

      if (identifier) {
        const cleanUpper = identifier.toUpperCase();
        const cleanLower = identifier.toLowerCase();
        if (mongoose.connection.readyState === 1) {
          userRecord = await User.findOne({
            $or: [
              { aiId: cleanUpper },
              { regNo: cleanUpper },
              { email: cleanLower }
            ]
          });
        } else {
          userRecord = memoryUsers.find(
            u => (u.aiId && u.aiId.toUpperCase() === cleanUpper) ||
                 (u.regNo && u.regNo.toUpperCase() === cleanUpper) ||
                 (u.email && u.email.toLowerCase() === cleanLower)
          );
        }
      }

      // If student not found in DB but details provided, auto-create participant account
      if (!userRecord && (m.name || m.regNo)) {
        const generatedId = generateAiId();
        const newRegNo = (m.regNo || `TEMP-${Date.now()}-${i + 1}`).trim().toUpperCase();
        const newEmail = (m.email || `${newRegNo.toLowerCase()}@vignan.ac.in`).trim().toLowerCase();
        const newPhone = (m.phone || '9999999999').trim();
        const newName = (m.name || `Student ${i + 1}`).trim();
        const newYear = String(m.year || '3').trim();
        const newGender = m.gender || 'Unspecified';

        if (mongoose.connection.readyState === 1) {
          try {
            userRecord = new User({
              aiId: generatedId,
              name: newName,
              regNo: newRegNo,
              dob: '2004-01-01',
              year: ['1', '2', '3', '4', 'M.Tech (1st year)', 'M.Tech (2nd year)'].includes(newYear) ? newYear : '3',
              gender: newGender,
              phone: /^\d{10}$/.test(newPhone) ? newPhone : `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              email: isValidEmail(newEmail) ? newEmail : `user_${Date.now()}_${i}@vignan.ac.in`,
              password: newRegNo.toLowerCase(),
              registeredEvents: []
            });
            await userRecord.save();
          } catch (createErr) {
            console.warn('[Admin Team Auto-User Create Warning]', createErr.message);
          }
        } else {
          userRecord = {
            aiId: generatedId,
            name: newName,
            regNo: newRegNo,
            dob: '2004-01-01',
            year: newYear,
            gender: newGender,
            phone: newPhone,
            email: newEmail,
            password: newRegNo.toLowerCase(),
            registeredEvents: []
          };
          memoryUsers.push(userRecord);
        }
      }

      const finalAiId = (userRecord?.aiId || m.aiId || `AI-${Date.now()}-${i}`).toUpperCase().trim();
      const finalRegNo = (userRecord?.regNo || m.regNo || '').toUpperCase().trim();
      const finalName = (userRecord?.name || m.name || `Member ${i + 1}`).trim();
      const finalYear = String(userRecord?.year || m.year || '3').trim();
      const finalSection = (m.section || userRecord?.section || '').trim();
      const finalEmail = (userRecord?.email || m.email || '').trim().toLowerCase();
      const finalPhone = (userRecord?.phone || m.phone || '').trim();
      const isLeader = Boolean(m.isLeader !== undefined ? m.isLeader : (i === 0));

      if (seenAiIds.has(finalAiId)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate student (${finalAiId}) found in member list. A student cannot be repeated.`
        });
      }
      seenAiIds.add(finalAiId);

      // Auto-enroll student into event if autoEnrollMembers is true
      if (userRecord && autoEnrollMembers) {
        const isEnrolled = isUserRegisteredForEvent(userRecord, cleanEventId, cleanEventTitle);
        if (!isEnrolled) {
          const newEventEntry = {
            id: cleanEventId,
            title: cleanEventTitle,
            categoryName: constraint.name || 'TEAM EVENT',
            categoryId: cleanEventId.includes('-') ? cleanEventId.split('-')[0] : 'team',
            registeredAt: new Date().toISOString()
          };
          if (mongoose.connection.readyState === 1) {
            await User.updateOne(
              { aiId: userRecord.aiId },
              { $push: { registeredEvents: newEventEntry } }
            );
          } else {
            if (!userRecord.registeredEvents) userRecord.registeredEvents = [];
            userRecord.registeredEvents.push(newEventEntry);
          }
        }
      }

      processedMembers.push({
        aiId: finalAiId,
        name: finalName,
        regNo: finalRegNo,
        year: finalYear,
        section: finalSection,
        email: finalEmail,
        phone: finalPhone,
        isLeader
      });
    }

    if (!processedMembers.some(m => m.isLeader)) {
      processedMembers[0].isLeader = true;
    }
    const leader = processedMembers.find(m => m.isLeader) || processedMembers[0];

    // Generate unique Team ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const teamId = `TEAM-${cleanEventId.toUpperCase()}-${randomCode}`;

    // Clean projectDetails if supplied
    let cleanProjectDetails = {};
    if (projectDetails && typeof projectDetails === 'object') {
      cleanProjectDetails = {
        agentName: (projectDetails.agentName || '').trim(),
        problemStatement: (projectDetails.problemStatement || '').trim(),
        targetUsers: (projectDetails.targetUsers || '').trim(),
        userInput: (projectDetails.userInput || '').trim(),
        informationUsed: (projectDetails.informationUsed || '').trim(),
        decisionsMade: (projectDetails.decisionsMade || '').trim(),
        toolsNeeded: (projectDetails.toolsNeeded || '').trim(),
        stepByStepWorkflow: (projectDetails.stepByStepWorkflow || '').trim(),
        finalResult: (projectDetails.finalResult || '').trim(),
        successMetrics: (projectDetails.successMetrics || '').trim(),
        failureModesAndChecks: (projectDetails.failureModesAndChecks || '').trim(),
        githubLink: (projectDetails.githubLink || '').trim(),
        demoLink: (projectDetails.demoLink || '').trim(),
        updatedBy: 'ADMIN_OVERRIDE',
        updatedAt: new Date()
      };
    }

    let savedTeam = null;
    if (mongoose.connection.readyState === 1) {
      savedTeam = new Team({
        teamId,
        teamName: cleanTeamName,
        eventId: cleanEventId,
        eventTitle: cleanEventTitle,
        leaderAiId: leader.aiId,
        members: processedMembers,
        projectDetails: cleanProjectDetails
      });
      await savedTeam.save();
    } else {
      savedTeam = {
        teamId,
        teamName: cleanTeamName,
        eventId: cleanEventId,
        eventTitle: cleanEventTitle,
        leaderAiId: leader.aiId,
        members: processedMembers,
        projectDetails: cleanProjectDetails,
        createdAt: new Date()
      };
      memoryTeams.push(savedTeam);
    }

    // Sync member registeredEvents
    for (const m of processedMembers) {
      try {
        if (mongoose.connection.readyState === 1) {
          await User.updateOne(
            { aiId: m.aiId },
            { $pull: { registeredEvents: { id: cleanEventId } } }
          );
          await User.updateOne(
            { aiId: m.aiId },
            {
              $push: {
                registeredEvents: {
                  id: cleanEventId,
                  title: cleanEventTitle,
                  categoryName: constraint.name || 'TEAM EVENT',
                  categoryId: cleanEventId.includes('-') ? cleanEventId.split('-')[0] : 'team',
                  teamId: teamId,
                  teamName: cleanTeamName,
                  isTeam: true,
                  isLeader: m.isLeader,
                  registeredAt: new Date().toISOString()
                }
              }
            }
          );
        } else {
          const userMem = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === m.aiId);
          if (userMem) {
            if (!userMem.registeredEvents) userMem.registeredEvents = [];
            userMem.registeredEvents = userMem.registeredEvents.filter(e => e.id !== cleanEventId && e.title !== cleanEventTitle);
            userMem.registeredEvents.push({
              id: cleanEventId,
              title: cleanEventTitle,
              categoryName: constraint.name || 'TEAM EVENT',
              categoryId: cleanEventId.includes('-') ? cleanEventId.split('-')[0] : 'team',
              teamId: teamId,
              teamName: cleanTeamName,
              isTeam: true,
              isLeader: m.isLeader,
              registeredAt: new Date().toISOString()
            });
          }
        }
      } catch (syncErr) {
        console.warn(`[Admin Team Sync Warning] Could not update user ${m.aiId}:`, syncErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Team '${cleanTeamName}' successfully registered by Admin for '${cleanEventTitle}'!`,
      team: savedTeam
    });
  } catch (error) {
    console.error('[Admin Team Registration Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during admin team registration.'
    });
  }
});

/**
 * GET /cseAI/team-registrations
 * Retrieve list of registered teams for Admin Dashboard
 */
router.get('/team-registrations', requireAdminAuth, async (req, res) => {
  try {
    const { search, event } = req.query;
    let teams = [];

    if (mongoose.connection.readyState === 1) {
      const query = {};

      if (event && event !== 'all') {
        const cleanEvent = String(event).trim().toLowerCase();
        
        let eventConditions = [
          { eventId: cleanEvent },
          { eventTitle: new RegExp(cleanEvent, 'i') }
        ];

        if (cleanEvent === 'technical-1' || cleanEvent === '1' || cleanEvent.includes('hackathon')) {
          eventConditions = [
            { eventId: 'technical-1' },
            { eventId: '1' },
            { eventTitle: new RegExp('hackathon', 'i') }
          ];
        } else if (cleanEvent === 'technical-2' || cleanEvent === '2' || cleanEvent.includes('prompt')) {
          eventConditions = [
            { eventId: 'technical-2' },
            { eventId: '2' },
            { eventTitle: new RegExp('prompt', 'i') }
          ];
        } else if (cleanEvent === 'technical-3' || cleanEvent === '3' || cleanEvent.includes('poster') || cleanEvent.includes('paper')) {
          eventConditions = [
            { eventId: 'technical-3' },
            { eventId: '3' },
            { eventTitle: new RegExp('poster|paper', 'i') }
          ];
        } else if (cleanEvent === 'industry-2' || cleanEvent.includes('expo')) {
          eventConditions = [
            { eventId: 'industry-2' },
            { eventId: '2' },
            { eventTitle: new RegExp('expo', 'i') }
          ];
        } else if (cleanEvent === 'creative-1' || cleanEvent.includes('reel')) {
          eventConditions = [
            { eventId: 'creative-1' },
            { eventId: '1' },
            { eventTitle: new RegExp('reel', 'i') }
          ];
        } else if (cleanEvent === 'creative-2' || cleanEvent.includes('music')) {
          eventConditions = [
            { eventId: 'creative-2' },
            { eventId: '2' },
            { eventTitle: new RegExp('music', 'i') }
          ];
        } else if (cleanEvent === 'creative-3' || cleanEvent.includes('quiz')) {
          eventConditions = [
            { eventId: 'creative-3' },
            { eventId: '3' },
            { eventTitle: new RegExp('quiz', 'i') }
          ];
        } else if (cleanEvent === 'creative-4' || cleanEvent.includes('quest')) {
          eventConditions = [
            { eventId: 'creative-4' },
            { eventId: '4' },
            { eventTitle: new RegExp('quest', 'i') }
          ];
        } else if (cleanEvent === 'innovative-1' || cleanEvent.includes('spark')) {
          eventConditions = [
            { eventId: 'innovative-1' },
            { eventId: '1' },
            { eventTitle: new RegExp('spark', 'i') }
          ];
        }

        query.$or = eventConditions;
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        const searchCond = [
          { teamName: regex },
          { teamId: regex },
          { eventTitle: regex },
          { 'members.name': regex },
          { 'members.aiId': regex },
          { 'members.regNo': regex }
        ];

        if (query.$or) {
          const evCond = query.$or;
          delete query.$or;
          query.$and = [{ $or: evCond }, { $or: searchCond }];
        } else {
          query.$or = searchCond;
        }
      }

      teams = await Team.find(query).sort({ createdAt: -1 });
    } else {
      teams = [...memoryTeams];

      if (event && event !== 'all') {
        const cleanEvent = String(event).trim().toLowerCase();
        teams = teams.filter(t =>
          String(t.eventId).toLowerCase() === cleanEvent ||
          String(t.eventId) === '2' ||
          (t.eventTitle && t.eventTitle.toLowerCase().includes(cleanEvent)) ||
          (cleanEvent.includes('prompt') && t.eventTitle && t.eventTitle.toLowerCase().includes('prompt'))
        );
      }

      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        teams = teams.filter(t =>
          (t.teamName && t.teamName.toLowerCase().includes(term)) ||
          (t.teamId && t.teamId.toLowerCase().includes(term)) ||
          (t.eventTitle && t.eventTitle.toLowerCase().includes(term)) ||
          (t.members && t.members.some(m =>
            (m.name && m.name.toLowerCase().includes(term)) ||
            (m.aiId && m.aiId.toLowerCase().includes(term)) ||
            (m.regNo && m.regNo.toLowerCase().includes(term))
          ))
        );
      }
    }

    return res.json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error fetching teams' });
  }
});

/**
 * DELETE /cseAI/team/:teamId
 * Removes a team registration from system (Admin action - Protected)
 */
router.delete('/team/:teamId', requireAdminAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!teamId || !teamId.trim()) {
      return res.status(400).json({ success: false, message: 'Team ID is required.' });
    }

    const cleanTeamId = teamId.trim();
    let targetTeam = null;

    if (mongoose.connection.readyState === 1) {
      targetTeam = await Team.findOne({ teamId: cleanTeamId });
      if (!targetTeam) {
        return res.status(404).json({ success: false, message: `Team with ID '${cleanTeamId}' not found.` });
      }
      await Team.deleteOne({ teamId: cleanTeamId });
    } else {
      const idx = memoryTeams.findIndex(t => t.teamId === cleanTeamId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: `Team with ID '${cleanTeamId}' not found.` });
      }
      targetTeam = memoryTeams[idx];
      memoryTeams.splice(idx, 1);
    }

    // Clean up registeredEvents entries from member User accounts
    if (targetTeam && Array.isArray(targetTeam.members)) {
      for (const m of targetTeam.members) {
        try {
          if (mongoose.connection.readyState === 1) {
            await User.updateOne(
              { aiId: m.aiId },
              { $pull: { registeredEvents: { teamId: cleanTeamId } } }
            );
          } else {
            const userMem = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === m.aiId.toUpperCase());
            if (userMem && Array.isArray(userMem.registeredEvents)) {
              userMem.registeredEvents = userMem.registeredEvents.filter(e => e.teamId !== cleanTeamId);
            }
          }
        } catch (err) {
          console.warn(`[Team Cleanup Warning] Could not remove team event from user ${m.aiId}:`, err.message);
        }
      }
    }

    return res.json({
      success: true,
      message: `Team '${targetTeam.teamName}' (${cleanTeamId}) removed successfully.`
    });

  } catch (error) {
    console.error('[Delete Team Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error removing team' });
  }
});

/**
 * POST /cseAI/team/:teamId/add-member
 * Adds a new member to an existing team (Admin action - Protected)
 */
router.post('/team/:teamId/add-member', requireAdminAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { studentAiId } = req.body;

    if (!teamId || !teamId.trim()) {
      return res.status(400).json({ success: false, message: 'Team ID is required.' });
    }
    if (!studentAiId || !studentAiId.trim()) {
      return res.status(400).json({ success: false, message: 'Student VUCSE AI ID or Reg No is required.' });
    }

    const cleanTeamId = teamId.trim();
    const targetAiId = studentAiId.trim().toUpperCase();

    let targetTeam = null;
    let targetUser = null;

    if (mongoose.connection.readyState === 1) {
      targetTeam = await Team.findOne({ teamId: cleanTeamId });
      if (!targetTeam) {
        return res.status(404).json({ success: false, message: `Team with ID '${cleanTeamId}' not found.` });
      }
      targetUser = await User.findOne({
        $or: [
          { aiId: targetAiId },
          { regNo: new RegExp(`^${targetAiId}$`, 'i') }
        ]
      });
    } else {
      targetTeam = memoryTeams.find(t => t.teamId === cleanTeamId);
      if (!targetTeam) {
        return res.status(404).json({ success: false, message: `Team with ID '${cleanTeamId}' not found.` });
      }
      targetUser = memoryUsers.find(u =>
        (u.aiId && u.aiId.toUpperCase() === targetAiId) ||
        (u.regNo && u.regNo.toUpperCase() === targetAiId)
      );
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: `Student '${targetAiId}' not found in system registrations.` });
    }

    const cleanUserAiId = targetUser.aiId.toUpperCase();

    // Check if student is already in this team
    if (targetTeam.members && targetTeam.members.some(m => m.aiId && m.aiId.toUpperCase() === cleanUserAiId)) {
      return res.status(400).json({ success: false, message: `Student '${targetUser.name}' (${cleanUserAiId}) is already a member of Team '${targetTeam.teamName}'.` });
    }

    // Check single-team constraint: student cannot be in another team for this event
    let existingTeams = [];
    if (mongoose.connection.readyState === 1) {
      existingTeams = await Team.find({ eventId: targetTeam.eventId });
    } else {
      existingTeams = memoryTeams.filter(t => t.eventId === targetTeam.eventId);
    }

    const conflictingTeam = existingTeams.find(t =>
      t.members && t.members.some(m => m.aiId && m.aiId.toUpperCase() === cleanUserAiId)
    );
    if (conflictingTeam) {
      return res.status(400).json({
        success: false,
        message: `Student '${targetUser.name}' (${cleanUserAiId}) is already registered in team '${conflictingTeam.teamName}' for this event.`
      });
    }

    // Add member to team
    const newMemberObj = {
      name: targetUser.name,
      aiId: targetUser.aiId,
      regNo: targetUser.regNo,
      year: targetUser.year,
      gender: targetUser.gender || 'Unspecified',
      phone: targetUser.phone || '',
      isLeader: false
    };

    targetTeam.members.push(newMemberObj);

    if (mongoose.connection.readyState === 1) {
      targetTeam.markModified('members');
      await targetTeam.save();
    }

    // Ensure event is in student's registeredEvents
    const teamEventEntry = {
      id: targetTeam.eventId,
      title: targetTeam.eventTitle,
      categoryName: targetTeam.categoryName || 'TEAM EVENT',
      categoryId: 'team',
      teamId: targetTeam.teamId,
      teamName: targetTeam.teamName,
      isTeam: true,
      isLeader: false,
      registeredAt: new Date().toISOString()
    };

    if (mongoose.connection.readyState === 1) {
      const userDoc = await User.findOne({ aiId: cleanUserAiId });
      if (userDoc) {
        if (!userDoc.registeredEvents) userDoc.registeredEvents = [];
        const existingIdx = userDoc.registeredEvents.findIndex(e => e.id === targetTeam.eventId || e.teamId === targetTeam.teamId);
        if (existingIdx !== -1) {
          userDoc.registeredEvents[existingIdx] = {
            ...userDoc.registeredEvents[existingIdx],
            ...teamEventEntry
          };
        } else {
          userDoc.registeredEvents.push(teamEventEntry);
        }
        userDoc.markModified('registeredEvents');
        await userDoc.save();
      }
    } else {
      if (!targetUser.registeredEvents) targetUser.registeredEvents = [];
      const existingIdx = targetUser.registeredEvents.findIndex(e => e.id === targetTeam.eventId || e.teamId === targetTeam.teamId);
      if (existingIdx !== -1) {
        targetUser.registeredEvents[existingIdx] = {
          ...targetUser.registeredEvents[existingIdx],
          ...teamEventEntry
        };
      } else {
        targetUser.registeredEvents.push(teamEventEntry);
      }
    }

    return res.json({
      success: true,
      message: `Student '${targetUser.name}' (${cleanUserAiId}) added to Team '${targetTeam.teamName}' successfully!`,
      team: targetTeam
    });
  } catch (error) {
    console.error('[Add Team Member Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error adding team member' });
  }
});

/**
 * POST /cseAI/team/:teamId/remove-member
 * Removes a member from an existing team (Admin action - Protected)
 */
router.post('/team/:teamId/remove-member', requireAdminAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberAiId } = req.body;

    if (!teamId || !teamId.trim()) {
      return res.status(400).json({ success: false, message: 'Team ID is required.' });
    }
    if (!memberAiId || !memberAiId.trim()) {
      return res.status(400).json({ success: false, message: 'Member AI ID is required.' });
    }

    const cleanTeamId = teamId.trim();
    const cleanMemberAiId = memberAiId.trim().toUpperCase();

    let targetTeam = null;

    if (mongoose.connection.readyState === 1) {
      targetTeam = await Team.findOne({ teamId: cleanTeamId });
    } else {
      targetTeam = memoryTeams.find(t => t.teamId === cleanTeamId);
    }

    if (!targetTeam) {
      return res.status(404).json({ success: false, message: `Team with ID '${cleanTeamId}' not found.` });
    }

    const memberIdx = (targetTeam.members || []).findIndex(m => m.aiId && m.aiId.toUpperCase() === cleanMemberAiId);
    if (memberIdx === -1) {
      return res.status(404).json({ success: false, message: `Member '${cleanMemberAiId}' is not in Team '${targetTeam.teamName}'.` });
    }

    const removedMember = targetTeam.members[memberIdx];
    const wasLeader = Boolean(removedMember.isLeader);

    targetTeam.members.splice(memberIdx, 1);

    // If team has 0 members left, delete team entirely
    if (targetTeam.members.length === 0) {
      if (mongoose.connection.readyState === 1) {
        await Team.deleteOne({ teamId: cleanTeamId });
      } else {
        const tIdx = memoryTeams.findIndex(t => t.teamId === cleanTeamId);
        if (tIdx !== -1) memoryTeams.splice(tIdx, 1);
      }
    } else {
      // If removed member was leader, assign leadership to next member
      if (wasLeader && targetTeam.members.length > 0) {
        targetTeam.members[0].isLeader = true;
        const newLeaderAiId = targetTeam.members[0].aiId;

        // Update new leader user record
        if (mongoose.connection.readyState === 1) {
          const newLeaderUser = await User.findOne({ aiId: newLeaderAiId });
          if (newLeaderUser && Array.isArray(newLeaderUser.registeredEvents)) {
            const evIdx = newLeaderUser.registeredEvents.findIndex(e => e.teamId === cleanTeamId);
            if (evIdx !== -1) {
              newLeaderUser.registeredEvents[evIdx].isLeader = true;
              newLeaderUser.markModified('registeredEvents');
              await newLeaderUser.save();
            }
          }
        } else {
          const newLeaderUser = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === newLeaderAiId.toUpperCase());
          if (newLeaderUser && Array.isArray(newLeaderUser.registeredEvents)) {
            const evIdx = newLeaderUser.registeredEvents.findIndex(e => e.teamId === cleanTeamId);
            if (evIdx !== -1) {
              newLeaderUser.registeredEvents[evIdx].isLeader = true;
            }
          }
        }
      }

      if (mongoose.connection.readyState === 1) {
        targetTeam.markModified('members');
        await targetTeam.save();
      }
    }

    // Clean up removed user's registeredEvents
    if (mongoose.connection.readyState === 1) {
      await User.updateOne(
        { aiId: cleanMemberAiId },
        { $pull: { registeredEvents: { teamId: cleanTeamId } } }
      );
    } else {
      const removedUser = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === cleanMemberAiId);
      if (removedUser && Array.isArray(removedUser.registeredEvents)) {
        removedUser.registeredEvents = removedUser.registeredEvents.filter(e => e.teamId !== cleanTeamId);
      }
    }

    return res.json({
      success: true,
      message: `Member '${removedMember.name}' (${cleanMemberAiId}) removed from Team '${targetTeam.teamName}'.`,
      team: targetTeam.members.length > 0 ? targetTeam : null
    });

  } catch (error) {
    console.error('[Remove Team Member Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error removing team member' });
  }
});

/**
 * POST /cseAI/admin/create-backup
 * Manual or automatic backup trigger for DB records & poster files
 */
router.post('/admin/create-backup', requireAdminAuth, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDbDir = BACKUP_DB_DIR;
    const backupPostersDir = BACKUP_POSTERS_DIR;
    const uploadsPostersDir = path.resolve(__dirname, '..', 'uploads', 'posters');

    if (!fs.existsSync(backupDbDir)) fs.mkdirSync(backupDbDir, { recursive: true });
    if (!fs.existsSync(backupPostersDir)) fs.mkdirSync(backupPostersDir, { recursive: true });
    if (!fs.existsSync(uploadsPostersDir)) fs.mkdirSync(uploadsPostersDir, { recursive: true });

    let users = [];
    let teams = [];

    if (mongoose.connection.readyState === 1) {
      users = await User.find().lean();
      teams = await Team.find().lean();
    } else {
      users = memoryUsers;
      teams = memoryTeams;
    }

    // Save JSON snapshots
    const usersBackupFile = path.join(backupDbDir, `users_backup_${timestamp}.json`);
    const teamsBackupFile = path.join(backupDbDir, `teams_backup_${timestamp}.json`);

    fs.writeFileSync(usersBackupFile, JSON.stringify(users, null, 2));
    fs.writeFileSync(teamsBackupFile, JSON.stringify(teams, null, 2));

    // Mirror poster files
    let copiedCount = 0;
    if (fs.existsSync(uploadsPostersDir)) {
      const uploadedFiles = fs.readdirSync(uploadsPostersDir);
      uploadedFiles.forEach(file => {
        const src = path.join(uploadsPostersDir, file);
        const dest = path.join(backupPostersDir, file);
        if (fs.statSync(src).isFile() && file !== '.gitkeep') {
          fs.copyFileSync(src, dest);
          copiedCount++;
        }
      });
    }

    return res.json({
      success: true,
      message: 'Backup created successfully on external server directory!',
      timestamp,
      backupLocation: BACKUP_DIR,
      userCount: users.length,
      teamCount: teams.length,
      postersCopied: copiedCount,
      files: {
        users: path.join(backupDbDir, `users_backup_${timestamp}.json`),
        teams: path.join(backupDbDir, `teams_backup_${timestamp}.json`)
      }
    });
  } catch (error) {
    console.error('[Backup Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POSTER & PAPER PRESENTATION REVIEWER ROUTES
// ==========================================

router.post('/reviewer-login', async (req, res) => {
  try {
    const { passkey, mode } = req.body;
    const cleanPasskey = String(passkey || '').trim();

    const POSTER_PASSKEY = 'vijitha202602';
    const REELS_PASSKEY = 'Honeyjoe@777';

    if (mode === 'reels' || mode === 'reels-reviewer') {
      if (cleanPasskey === REELS_PASSKEY) {
        return res.json({
          success: true,
          message: 'Reels Reviewer authenticated successfully!',
          token: `REV_${Date.now()}_REELS_KEY`,
          reviewer: {
            name: 'Reels Competition Review Panel',
            role: 'reels-reviewer'
          }
        });
      }
    } else if (mode === 'poster' || mode === 'poster-reviewer') {
      if (cleanPasskey === POSTER_PASSKEY) {
        return res.json({
          success: true,
          message: 'Poster Reviewer authenticated successfully!',
          token: `REV_${Date.now()}_POSTER_KEY`,
          reviewer: {
            name: 'Poster & Paper Review Panel',
            role: 'poster-reviewer'
          }
        });
      }
    } else {
      if (cleanPasskey === POSTER_PASSKEY) {
        return res.json({
          success: true,
          message: 'Poster Reviewer authenticated successfully!',
          token: `REV_${Date.now()}_POSTER_KEY`,
          reviewer: {
            name: 'Poster & Paper Review Panel',
            role: 'poster-reviewer'
          }
        });
      }
      if (cleanPasskey === REELS_PASSKEY) {
        return res.json({
          success: true,
          message: 'Reels Reviewer authenticated successfully!',
          token: `REV_${Date.now()}_REELS_KEY`,
          reviewer: {
            name: 'Reels Competition Review Panel',
            role: 'reels-reviewer'
          }
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Reviewer Passkey. Access Denied.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reviewer-submissions', async (req, res) => {
  try {
    const { mode, type } = req.query;
    const filterMode = String(mode || type || '').toLowerCase();

    let allUsers = [];
    let allTeams = [];

    if (mongoose.connection.readyState === 1) {
      const HEAVY_FILE_PROJECTION = '-password -registeredEvents.submission.posterFile.fileData -registeredEvents.submission.paperFile.fileData -registeredEvents.submission.resubmissionHistory.posterFile.fileData -registeredEvents.submission.resubmissionHistory.paperFile.fileData';
      allUsers = await User.find({}).select(HEAVY_FILE_PROJECTION).lean();
      allTeams = await Team.find({}).lean();
    } else {
      allUsers = memoryUsers;
      allTeams = memoryTeams;
    }

    const submissionsList = [];

    allUsers.forEach(u => {
      if (u.registeredEvents && Array.isArray(u.registeredEvents)) {
        u.registeredEvents.forEach(e => {
          const sub = e.submission || {};
          const hasFilesOrLinks = Boolean(
            sub.posterFile || sub.posterLink || sub.reelLink || sub.paperFile || sub.paperLink || sub.fileUrl || sub.driveLink
          );
          const isResubmitStatus = sub.reviewStatus === 'RESUBMIT_ALLOWED' || sub.allowResubmit || (Array.isArray(sub.resubmissionHistory) && sub.resubmissionHistory.length > 0);

          if (e.submission && (hasFilesOrLinks || isResubmitStatus)) {
            const title = String(e.title || '').toLowerCase();
            const eId = String(e.id || '').toLowerCase();

            const isReel = eId === 'creative-1' || title.includes('reel') || sub.submissionType === 'reel' || Boolean(sub.reelLink);
            const isPoster = eId === 'technical-3' || title.includes('poster') || title.includes('paper') || sub.submissionType === 'paper' || sub.submissionType === 'poster' || Boolean(sub.posterFile || sub.posterLink || sub.paperFile || sub.paperLink || sub.fileUrl || sub.driveLink) || isResubmitStatus;

            if (filterMode === 'reels' && !isReel) return;
            if (filterMode === 'poster' && (!isPoster || title.includes('reel'))) return;

            const uAiId = (u.aiId || '').toUpperCase();
            const team = allTeams.find(t =>
              ((t.eventId && t.eventId === e.id) || (t.eventTitle && e.title && t.eventTitle.toLowerCase() === e.title.toLowerCase())) &&
              t.members && t.members.some(m => (m.aiId || '').toUpperCase() === uAiId)
            );

            const existingIdx = submissionsList.findIndex(item =>
              item.eventId === e.id &&
              ((team && item.teamName && item.teamName === team.teamName) ||
               (item.studentAiId && item.studentAiId === (e.submission.submittedBy?.aiId || u.aiId)))
            );

            if (existingIdx === -1) {
              submissionsList.push({
                submissionId: `${u.aiId || u.regNo}_${e.id}`,
                studentName: u.name,
                studentAiId: u.aiId,
                studentRegNo: u.regNo,
                studentYear: u.year,
                studentEmail: u.email,
                studentPhone: u.phone,
                eventTitle: e.title,
                eventId: e.id,
                categoryId: e.categoryId,
                teamName: team ? team.teamName : null,
                teamMembers: team ? team.members : null,
                submission: e.submission,
                reviewStatus: e.submission.reviewStatus || 'PENDING',
                rejectionReason: e.submission.rejectionReason || '',
                reviewedAt: e.submission.reviewedAt || null,
                reviewedBy: e.submission.reviewedBy || null
              });
            }
          }
        });
      }
    });

    return res.json({
      success: true,
      submissions: submissionsList
    });
  } catch (err) {
    console.error('[Reviewer Fetch Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /cseAI/submission-file
 * On-demand endpoint to fetch submission file details/Base64 for a specific user and event
 */
router.get('/submission-file', async (req, res) => {
  try {
    const { identifier, eventId } = req.query;
    if (!identifier || !eventId) {
      return res.status(400).json({ success: false, message: 'identifier and eventId query parameters required.' });
    }
    const cleanId = String(identifier).trim().toUpperCase();
    const cleanEventId = String(eventId).trim();

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { aiId: cleanId },
          { regNo: cleanId },
          { email: cleanId.toLowerCase() }
        ]
      }).lean();
    } else {
      user = memoryUsers.find(u =>
        (u.aiId && u.aiId.toUpperCase() === cleanId) ||
        (u.regNo && u.regNo.toUpperCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
      );
    }

    if (!user || !Array.isArray(user.registeredEvents)) {
      return res.status(404).json({ success: false, message: 'User or submission not found.' });
    }

    const matchedEvent = user.registeredEvents.find(e =>
      String(e.id) === cleanEventId ||
      (e.title && e.title.toLowerCase().includes(cleanEventId.toLowerCase()))
    );

    if (!matchedEvent || !matchedEvent.submission) {
      return res.status(404).json({ success: false, message: 'Submission not found for this event.' });
    }

    const sub = matchedEvent.submission;
    const fileObj = sub.posterFile || sub.paperFile;

    if (!fileObj) {
      return res.status(404).json({ success: false, message: 'No file attachment found in submission.' });
    }

    let fileData = fileObj.fileData;
    if (!fileData && (fileObj.savedDiskPath || fileObj.serverUrl)) {
      try {
        const relPath = fileObj.savedDiskPath || fileObj.serverUrl.replace(/^\//, '');
        const absPath = path.resolve(__dirname, '..', relPath);
        if (fs.existsSync(absPath)) {
          const fileBuf = fs.readFileSync(absPath);
          const mime = fileObj.fileType || 'application/pdf';
          fileData = `data:${mime};base64,${fileBuf.toString('base64')}`;
        }
      } catch (fErr) {
        console.warn('[Disk Read Warning]', fErr.message);
      }
    }

    return res.json({
      success: true,
      fileName: fileObj.fileName,
      fileSize: fileObj.fileSize,
      fileType: fileObj.fileType || 'application/pdf',
      fileData: fileData || null,
      serverUrl: fileObj.serverUrl || (fileObj.savedDiskPath ? `/${fileObj.savedDiskPath}` : null)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ===================================================================
 * AI AGENT EXPO & AGENTIC AI HACKATHON — PROJECT PRESENTATION SYSTEM
 * ===================================================================
 */

/**
 * POST /cseAI/submit-project-details
 * Submits or updates detailed presentation metadata for AI Agent Expo / Hackathon
 */
router.post('/submit-project-details', async (req, res) => {
  try {
    const {
      identifier,
      teamId,
      eventId,
      eventTitle,
      teamName,
      members,
      projectDetails
    } = req.body;

    if (!projectDetails || !projectDetails.agentName || !projectDetails.problemStatement) {
      return res.status(400).json({
        success: false,
        message: 'Agent Name and Problem Statement are required fields.'
      });
    }

    const cleanIdentifier = String(identifier || '').trim().toUpperCase();
    const cleanEventId = String(eventId || '').trim().toLowerCase();
    const cleanEventTitle = String(eventTitle || '').trim();

    if (!cleanIdentifier) {
      return res.status(401).json({
        success: false,
        message: 'Authentication Required: Please provide Leader ID to submit or update team project details.'
      });
    }

    // 1. Locate the submitting user / leader
    const user = await User.findOne({
      $or: [
        { aiId: cleanIdentifier },
        { regNo: cleanIdentifier },
        { email: cleanIdentifier.toLowerCase() },
        { phone: cleanIdentifier }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${cleanIdentifier}' not found. Please ensure you are using a registered ID.`
      });
    }

    // Determine target team: user MUST be in a registered team
    let team = null;
    if (teamId) {
      team = await Team.findOne({ teamId: String(teamId).trim() });
    }

    if (!team) {
      // Find team where this user is a registered member or leader for this event
      team = await Team.findOne({
        eventId: cleanEventId,
        'members.aiId': user.aiId
      });

      if (!team) {
        team = await Team.findOne({
          'members.aiId': user.aiId,
          $or: [
            { eventId: cleanEventId },
            { eventTitle: new RegExp(cleanEventTitle || 'hackathon|expo', 'i') }
          ]
        });
      }
    }

    // Check if user has an enrolled team in registeredEvents
    const enrolledTeamEvent = user.registeredEvents?.find(e => 
      (e.id === cleanEventId || (cleanEventTitle && (e.title || '').toLowerCase() === cleanEventTitle.toLowerCase())) &&
      (e.isTeam || e.teamId)
    );

    // STRICT ACCESS CONTROL: Only registered teams are allowed to enter details
    if (!team && !enrolledTeamEvent) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only officially registered teams for AI Agent Expo or Agentic AI Hackathon can submit project presentation details. Please register your team first under "Team Registrations".'
      });
    }

    const updatedProjectData = {
      agentName: String(projectDetails.agentName || '').trim(),
      problemStatement: String(projectDetails.problemStatement || '').trim(),
      targetUsers: String(projectDetails.targetUsers || '').trim(),
      userInput: String(projectDetails.userInput || '').trim(),
      informationUsed: String(projectDetails.informationUsed || '').trim(),
      decisionsMade: String(projectDetails.decisionsMade || '').trim(),
      toolsNeeded: String(projectDetails.toolsNeeded || '').trim(),
      stepByStepWorkflow: String(projectDetails.stepByStepWorkflow || '').trim(),
      finalResult: String(projectDetails.finalResult || '').trim(),
      successMetrics: String(projectDetails.successMetrics || '').trim(),
      failureModesAndChecks: String(projectDetails.failureModesAndChecks || '').trim(),
      githubLink: String(projectDetails.githubLink || '').trim(),
      demoLink: String(projectDetails.demoLink || '').trim(),
      updatedBy: user.name ? `${user.name} (${user.aiId})` : cleanIdentifier,
      updatedAt: new Date()
    };

    if (team) {
      // Verify submitting user is actually a member or leader of this team
      const isMember = team.members.some(m => m.aiId === user.aiId || m.regNo === user.regNo);
      if (!isMember && team.leaderAiId !== user.aiId) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You are not authorized to edit project details for this team.'
        });
      }

      team.projectDetails = updatedProjectData;
      if (teamName && teamName.trim()) {
        team.teamName = teamName.trim();
      }
      if (Array.isArray(members) && members.length > 0) {
        // Update member roster sections
        members.forEach(mem => {
          const existingMem = team.members.find(m => (mem.regNo && m.regNo === mem.regNo) || (mem.aiId && m.aiId === mem.aiId));
          if (existingMem) {
            if (mem.section) existingMem.section = mem.section;
            if (mem.year) existingMem.year = mem.year;
          }
        });
      }
      team.markModified('projectDetails');
      team.markModified('members');
      await team.save();

      // Synchronize projectDetails to User registeredEvents
      const memberAiIds = team.members.map(m => m.aiId).filter(Boolean);
      if (memberAiIds.length > 0) {
        await User.updateMany(
          { 
            aiId: { $in: memberAiIds },
            'registeredEvents.id': team.eventId
          },
          {
            $set: {
              'registeredEvents.$.submission.projectDetails': updatedProjectData,
              'registeredEvents.$.teamName': team.teamName
            }
          }
        );
      }

      return res.json({
        success: true,
        message: 'Project presentation details updated successfully for registered team!',
        team,
        projectDetails: updatedProjectData
      });
    }

    // If user has enrolledTeamEvent
    const eventIdx = user.registeredEvents.findIndex(
      e => (e.id === cleanEventId || (cleanEventTitle && (e.title || '').toLowerCase() === cleanEventTitle.toLowerCase()))
    );

    if (eventIdx !== -1) {
      if (!user.registeredEvents[eventIdx].submission) {
        user.registeredEvents[eventIdx].submission = {};
      }
      user.registeredEvents[eventIdx].submission.projectDetails = updatedProjectData;
      user.markModified('registeredEvents');
      await user.save();

      return res.json({
        success: true,
        message: 'Project presentation details saved for your registered team!',
        projectDetails: updatedProjectData
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only registered teams are permitted to submit project details.'
    });

  } catch (err) {
    console.error('Error submitting project details:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error while submitting project details'
    });
  }
});

/**
 * GET /cseAI/showcase-projects
 * Public presentation endpoint: returns all submitted Hackathon and Expo projects
 */
router.get('/showcase-projects', async (req, res) => {
  try {
    const { eventType, search, year } = req.query;

    // Fetch all teams that have projectDetails filled
    const teams = await Team.find({
      'projectDetails.agentName': { $exists: true, $ne: '' }
    }).lean();

    const formattedList = teams.map(t => {
      const isExpo = t.eventId === 'industry-2' || (t.eventTitle || '').toLowerCase().includes('expo');
      const resolvedEventType = isExpo ? 'AI Agent Expo' : 'Agentic AI Hackathon';

      return {
        id: t.teamId,
        teamId: t.teamId,
        teamName: t.teamName,
        eventId: t.eventId,
        eventTitle: t.eventTitle,
        eventType: resolvedEventType,
        members: (t.members || []).map(m => ({
          name: m.name,
          regNo: m.regNo,
          year: m.year,
          section: m.section || '',
          isLeader: Boolean(m.isLeader),
          aiId: m.aiId
        })),
        projectDetails: t.projectDetails || {},
        updatedAt: t.projectDetails?.updatedAt || t.updatedAt
      };
    });

    // Also check Users with individual/team projectDetails not yet linked to Team model
    const usersWithProjects = await User.find({
      'registeredEvents.submission.projectDetails.agentName': { $exists: true, $ne: '' }
    }).select('name regNo year aiId registeredEvents').lean();

    usersWithProjects.forEach(u => {
      (u.registeredEvents || []).forEach(e => {
        const pd = e.submission?.projectDetails;
        if (pd && pd.agentName) {
          // Check if already in formattedList by agentName or teamId
          const exists = formattedList.some(item => 
            item.projectDetails?.agentName?.toLowerCase() === pd.agentName.toLowerCase() ||
            (e.teamId && item.teamId === e.teamId)
          );
          if (!exists) {
            const isExpo = e.id === 'industry-2' || (e.title || '').toLowerCase().includes('expo');
            formattedList.push({
              id: `${u.aiId}_${e.id}`,
              teamId: e.teamId || `IND-${u.aiId}`,
              teamName: e.teamName || `${u.name}'s Project`,
              eventId: e.id,
              eventTitle: e.title,
              eventType: isExpo ? 'AI Agent Expo' : 'Agentic AI Hackathon',
              members: [
                {
                  name: u.name,
                  regNo: u.regNo,
                  year: u.year,
                  section: '',
                  isLeader: true,
                  aiId: u.aiId
                }
              ],
              projectDetails: pd,
              updatedAt: pd.updatedAt || new Date()
            });
          }
        }
      });
    });

    // Apply Filters if query params present
    let filtered = formattedList;
    if (eventType && eventType !== 'ALL') {
      const cleanType = String(eventType).toLowerCase();
      filtered = filtered.filter(p => p.eventType.toLowerCase().includes(cleanType) || p.eventTitle.toLowerCase().includes(cleanType));
    }

    if (year && year !== 'ALL') {
      filtered = filtered.filter(p => p.members?.some(m => String(m.year) === String(year)));
    }

    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p.projectDetails?.agentName || '').toLowerCase().includes(q) ||
        (p.projectDetails?.problemStatement || '').toLowerCase().includes(q) ||
        (p.projectDetails?.toolsNeeded || '').toLowerCase().includes(q) ||
        (p.teamName || '').toLowerCase().includes(q) ||
        p.members?.some(m => 
          (m.name || '').toLowerCase().includes(q) ||
          (m.regNo || '').toLowerCase().includes(q) ||
          (m.section || '').toLowerCase().includes(q)
        )
      );
    }

    // Stats breakdown
    const totalProjects = formattedList.length;
    const hackathonCount = formattedList.filter(p => p.eventType === 'Agentic AI Hackathon').length;
    const expoCount = formattedList.filter(p => p.eventType === 'AI Agent Expo').length;
    const liveDeployedCount = formattedList.filter(p => p.projectDetails?.demoLink && p.projectDetails.demoLink.startsWith('http')).length;
    const totalMembersCount = formattedList.reduce((acc, curr) => acc + (curr.members?.length || 0), 0);

    return res.json({
      success: true,
      stats: {
        totalProjects,
        hackathonCount,
        expoCount,
        liveDeployedCount,
        totalMembersCount
      },
      projects: filtered
    });
  } catch (err) {
    console.error('Error fetching showcase projects:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch showcase projects'
    });
  }
});

/**
 * GET /cseAI/project-details
 * Fetches project details and verifies registered team for a specific team or Leader ID + Event
 */
router.get('/project-details', async (req, res) => {
  try {
    const { teamId, identifier, eventId, eventTitle } = req.query;

    if (teamId) {
      const team = await Team.findOne({ teamId: String(teamId).trim() });
      if (team) {
        return res.json({
          success: true,
          team,
          projectDetails: team.projectDetails || {}
        });
      }
    }

    if (identifier) {
      const cleanIdentifier = String(identifier).trim().toUpperCase();
      const cleanEventId = eventId ? String(eventId).trim().toLowerCase() : '';
      const cleanEventTitle = eventTitle ? String(eventTitle).trim() : '';

      // 1. Locate user by AI ID, Reg No, Email or Phone
      const user = await User.findOne({
        $or: [
          { aiId: cleanIdentifier },
          { regNo: cleanIdentifier },
          { email: cleanIdentifier.toLowerCase() },
          { phone: cleanIdentifier }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User '${cleanIdentifier}' not found in the database. Please verify the Leader ID or Registration Number.`
        });
      }

      // 2. Query Team matching user and event
      const eventQueries = [];
      if (cleanEventId) eventQueries.push({ eventId: cleanEventId });
      if (cleanEventTitle) eventQueries.push({ eventTitle: new RegExp(cleanEventTitle, 'i') });
      if (cleanEventId.includes('hack') || cleanEventId === 'technical-1' || cleanEventId === '1') {
        eventQueries.push({ eventId: 'technical-1' }, { eventTitle: /hackathon/i });
      }
      if (cleanEventId.includes('expo') || cleanEventId === 'industry-2' || cleanEventId === '2') {
        eventQueries.push({ eventId: 'industry-2' }, { eventTitle: /expo/i });
      }

      let teamQuery = {
        $or: [
          { leaderAiId: user.aiId },
          { 'members.aiId': user.aiId },
          { 'members.regNo': user.regNo }
        ]
      };

      if (eventQueries.length > 0) {
        teamQuery.$and = [{ $or: eventQueries }];
      }

      let team = await Team.findOne(teamQuery);

      if (team) {
        return res.json({
          success: true,
          team,
          projectDetails: team.projectDetails || {},
          user: {
            name: user.name,
            regNo: user.regNo,
            year: user.year,
            aiId: user.aiId
          }
        });
      }

      // 3. Fall back to user's registeredEvents if enrolled in a team
      const matchedEvent = user.registeredEvents?.find(e => {
        const titleMatch = cleanEventTitle ? (e.title || '').toLowerCase().includes(cleanEventTitle.toLowerCase()) : true;
        const idMatch = cleanEventId ? (e.id === cleanEventId || (cleanEventId === 'technical-1' && (e.title || '').toLowerCase().includes('hackathon')) || (cleanEventId === 'industry-2' && (e.title || '').toLowerCase().includes('expo'))) : true;
        return (titleMatch || idMatch) && (e.isTeam || e.teamId);
      });

      if (matchedEvent) {
        return res.json({
          success: true,
          team: {
            teamId: matchedEvent.teamId || `TEAM-${user.aiId}`,
            teamName: matchedEvent.teamName || `${user.name}'s Team`,
            eventId: matchedEvent.id || cleanEventId,
            eventTitle: matchedEvent.title || cleanEventTitle,
            leaderAiId: user.aiId,
            members: [
              {
                name: user.name,
                regNo: user.regNo,
                year: user.year,
                section: '',
                isLeader: true,
                aiId: user.aiId
              }
            ]
          },
          projectDetails: matchedEvent.submission?.projectDetails || {},
          user: {
            name: user.name,
            regNo: user.regNo,
            year: user.year,
            aiId: user.aiId
          }
        });
      }

      const eventLabel = cleanEventTitle || (cleanEventId.includes('expo') ? 'AI Agent Expo' : 'Agentic AI Hackathon');
      return res.status(404).json({
        success: false,
        message: `No registered team found for '${user.name}' (${user.aiId}) in '${eventLabel}'. Please ensure your team is registered first under Team Registrations.`
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Please provide Team Leader Registration ID (VU ID) and select the event.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


export default router;



