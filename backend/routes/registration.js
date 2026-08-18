import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { generateAiId, memoryUsers } from '../utils/idGenerator.js';
import { requireAdminAuth, getAdminSecretToken, generateUserJwt } from '../middleware/adminAuth.js';
import mongoose from 'mongoose';
import { BACKUP_DB_DIR, BACKUP_POSTERS_DIR, BACKUP_DIR } from '../config/paths.js';

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
  'creative-2': { min: 3, max: 3, name: 'AI MUSICAL COMPETITION' },
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
        $or: [{ email: cleanEmail }, { regNo: cleanRegNo }]
      });

      if (existingUser) {
        if (existingUser.email === cleanEmail) {
          return res.status(400).json({
            success: false,
            message: `User with email '${cleanEmail}' is already registered (VUCSE ID: ${existingUser.aiId}).`
          });
        }
        if (existingUser.regNo === cleanRegNo) {
          return res.status(400).json({
            success: false,
            message: `Registration number '${cleanRegNo}' is already registered (VUCSE ID: ${existingUser.aiId}).`
          });
        }
      }
    } else {
      // In-memory check
      const existingMem = memoryUsers.find(u => u.email === cleanEmail || u.regNo === cleanRegNo);
      if (existingMem) {
        return res.status(400).json({
          success: false,
          message: `User with email or registration number is already registered (VUCSE ID: ${existingMem.aiId}).`
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
        if (error.code === 11000 && attempt < MAX_RETRIES) {
          console.warn(`[Collision Retry] Duplicate AI ID collision on attempt ${attempt}, retrying...`);
          continue;
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

      users = await User.find(query).select('-password').sort({ createdAt: -1 });
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
      allUsers = await User.find().select('year gender registeredEvents');
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


/**
 * POST /cseAI/team-register
 * Handles team registration for event with strict team size & single-team constraints
 */
router.post('/team-register', async (req, res) => {
  try {
    const { teamName, eventId, eventTitle, members, currentUserAiId } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team Name is a mandatory field.' });
    }
    if (!eventId || !eventId.trim()) {
      return res.status(400).json({ success: false, message: 'Event selection is required.' });
    }
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Team must have at least 1 member.' });
    }

    // Ensure Member #1 (Team Leader) is the registering user's own AI ID if currentUserAiId is supplied
    if (currentUserAiId && currentUserAiId.trim()) {
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


    // 1. Verify Event Constraint (Min and Max team size)
    const constraint = EVENT_CONSTRAINTS[cleanEventId] || { min: 1, max: 5, name: cleanEventTitle };
    if (members.length < constraint.min || members.length > constraint.max) {
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
        const cleanEvent = String(event).trim();
        query.$or = [
          { eventId: cleanEvent },
          { eventTitle: new RegExp(cleanEvent, 'i') }
        ];
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
          (t.eventTitle && t.eventTitle.toLowerCase().includes(cleanEvent))
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
      allUsers = await User.find({}).lean();
      allTeams = await Team.find({}).lean();
    } else {
      allUsers = memoryUsers;
      allTeams = memoryTeams;
    }

    const submissionsList = [];

    allUsers.forEach(u => {
      if (u.registeredEvents && Array.isArray(u.registeredEvents)) {
        u.registeredEvents.forEach(e => {
          if (e.submission && (e.submission.posterFile || e.submission.posterLink || e.submission.reelLink)) {
            const title = String(e.title || '').toLowerCase();
            const eId = String(e.id || '').toLowerCase();
            const sub = e.submission || {};

            const isReel = eId === 'creative-1' || title.includes('reel') || Boolean(sub.reelLink);
            const isPoster = eId === 'technical-3' || title.includes('poster') || title.includes('paper') || Boolean(sub.posterFile || sub.posterLink);

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

router.post('/review-submission', async (req, res) => {
  try {
    const { studentAiId, eventId, eventTitle, status, rejectionReason, reviewerName } = req.body;

    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid review status is required (APPROVED or REJECTED).' });
    }

    if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'Explanation/Reason for rejection is required.' });
    }

    const cleanAiId = (studentAiId || '').toUpperCase();
    const cleanEvtId = String(eventId || '').trim().toLowerCase();
    const cleanEvtTitle = String(eventTitle || '').trim().toLowerCase();

    const isMatchEvent = (e) => {
      const eId = String(e.id || '').trim().toLowerCase();
      const eTitle = String(e.title || '').trim().toLowerCase();
      return (cleanEvtId && eId === cleanEvtId) || (cleanEvtTitle && eTitle === cleanEvtTitle);
    };

    let targetUsers = [];
    let activeTeam = null;

    if (mongoose.connection.readyState === 1) {
      activeTeam = await Team.findOne({
        'members.aiId': cleanAiId
      });
      if (activeTeam) {
        const teamAiIds = activeTeam.members.map(m => m.aiId.toUpperCase());
        targetUsers = await User.find({ aiId: { $in: teamAiIds } });
      } else {
        const singleUser = await User.findOne({ aiId: cleanAiId });
        if (singleUser) targetUsers = [singleUser];
      }
    } else {
      activeTeam = memoryTeams.find(t => t.members && t.members.some(m => m.aiId && m.aiId.toUpperCase() === cleanAiId));
      if (activeTeam) {
        const teamAiIds = activeTeam.members.map(m => m.aiId.toUpperCase());
        targetUsers = memoryUsers.filter(u => u.aiId && teamAiIds.includes(u.aiId.toUpperCase()));
      } else {
        const singleUser = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === cleanAiId);
        if (singleUser) targetUsers = [singleUser];
      }
    }

    if (targetUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'Student submission record not found.' });
    }

    const reviewUpdate = {
      reviewStatus: status,
      rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerName || 'Poster & Paper Reviewer'
    };

    for (const u of targetUsers) {
      if (u.registeredEvents && Array.isArray(u.registeredEvents)) {
        const idx = u.registeredEvents.findIndex(e => isMatchEvent(e));
        if (idx !== -1 && u.registeredEvents[idx].submission) {
          u.registeredEvents[idx].submission = {
            ...u.registeredEvents[idx].submission,
            ...reviewUpdate
          };

          if (mongoose.connection.readyState === 1) {
            u.markModified('registeredEvents');
            await u.save();
          }
        }
      }
    }

    return res.json({
      success: true,
      message: `Submission marked as ${status} successfully!`,
      reviewUpdate
    });
  } catch (err) {
    console.error('[Review Submission Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;


