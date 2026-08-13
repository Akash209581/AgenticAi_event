import express from 'express';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { memoryUsers } from '../utils/idGenerator.js';
import { memoryTeams } from './registration.js';
import { getAdminSecretToken, generateAdminJwt, generateUserJwt } from '../middleware/adminAuth.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BACKUP_POSTERS_DIR } from '../config/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();


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

    const token = generateAdminJwt(cleanUser);

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

    // Normalize: email is stored lowercase, aiId/regNo are stored uppercase
    const cleanIdLower = identifier.trim().toLowerCase();
    const cleanIdUpper = identifier.trim().toUpperCase();
    const cleanPassword = password.trim();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      // Use exact-match on indexed fields (no regex → index is used → fast)
      user = await User.findOne({
        $or: [
          { email: cleanIdLower },
          { regNo: cleanIdUpper },
          { aiId: cleanIdUpper }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanIdLower ||
             u.regNo.toUpperCase() === cleanIdUpper ||
             u.aiId.toUpperCase() === cleanIdUpper
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

    const token = generateUserJwt(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
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

    const cleanIdLower = identifier.trim().toLowerCase();
    const cleanIdUpper = identifier.trim().toUpperCase();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { email: cleanIdLower },
          { regNo: cleanIdUpper },
          { aiId: cleanIdUpper }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanIdLower ||
             u.regNo.toUpperCase() === cleanIdUpper ||
             u.aiId.toUpperCase() === cleanIdUpper
      );
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    // Initialize registeredEvents if undefined
    if (!user.registeredEvents) {
      user.registeredEvents = [];
    }

    // Check if already enrolled (robust category & title matching)
    const cleanTargetTitle = String(event.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetCat = String(event.categoryId || event.categoryName || '').toLowerCase();
    const targetId = String(event.id || '').toLowerCase();

    const exists = user.registeredEvents.some(e => {
      const cleanETitle = String(e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const eCat = String(e.categoryId || e.categoryName || '').toLowerCase();
      const eId = String(e.id || '').toLowerCase();

      // 1. Title match
      if (cleanTargetTitle && cleanETitle) {
        if (cleanTargetTitle === cleanETitle || cleanTargetTitle.includes(cleanETitle) || cleanETitle.includes(cleanTargetTitle)) {
          return true;
        }
      }

      // 2. ID match (only if non-numeric OR if categories match)
      if (targetId && eId && targetId === eId) {
        if (!/^[0-9]+$/.test(targetId)) {
          return true;
        }
        if (targetCat && eCat && (targetCat.includes(eCat) || eCat.includes(targetCat))) {
          return true;
        }
      }

      return false;
    });

    if (!exists) {
      // Check if registration deadline has passed for this event
      const isBootcamp = cleanTargetTitle.includes('bootcamp') || targetId.includes('bootcamp');
      if (isBootcamp) {
        const bootcampDeadline = new Date('2026-08-18T23:59:59.999+05:30');
        if (new Date() > bootcampDeadline) {
          return res.status(400).json({
            success: false,
            message: `Registration for '${event.title || 'AI AGENT BOOTCAMP'}' ended on 18th August 2026.`
          });
        }
      } else if (event.registrationDeadline) {
        const cleanStr = String(event.registrationDeadline).replace(/(\d+)(st|nd|rd|th)/i, '$1').trim();
        const parsed = new Date(cleanStr);
        if (!isNaN(parsed.getTime())) {
          parsed.setHours(23, 59, 59, 999);
          if (new Date() > parsed) {
            return res.status(400).json({
              success: false,
              message: `Registration for '${event.title}' ended on ${event.registrationDeadline}.`
            });
          }
        }
      }

      const compositeId = (event.categoryId && event.id && !String(event.id).includes('-'))
        ? `${event.categoryId}-${event.id}`
        : (event.id || 'custom-event');

      const newEventEntry = {
        id: compositeId,
        title: event.title,
        categoryName: event.categoryName || event.category || 'EVENT COMPETITION',
        categoryId: event.categoryId || 'technical',
        image: event.image || '',
        registeredAt: new Date().toISOString()
      };

      user.registeredEvents.push(newEventEntry);

      if (mongoose.connection.readyState === 1) {
        user.markModified('registeredEvents');
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

    const cleanIdLower = identifier.trim().toLowerCase();
    const cleanIdUpper = identifier.trim().toUpperCase();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { email: cleanIdLower },
          { regNo: cleanIdUpper },
          { aiId: cleanIdUpper }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanIdLower ||
             u.regNo.toUpperCase() === cleanIdUpper ||
             u.aiId.toUpperCase() === cleanIdUpper
      );
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    // Check if user is part of an active team for this event
    const userAiId = user.aiId ? user.aiId.toUpperCase() : '';
    const cleanEvtId = String(eventId || '').trim();
    const cleanEvtTitle = String(eventTitle || '').trim().toLowerCase();

    let activeTeam = null;
    if (mongoose.connection.readyState === 1) {
      const searchCond = [];
      if (cleanEvtId) searchCond.push({ eventId: cleanEvtId });
      if (cleanEvtTitle) searchCond.push({ eventTitle: { $regex: new RegExp(`^${cleanEvtTitle}$`, 'i') } });

      if (searchCond.length > 0) {
        activeTeam = await Team.findOne({
          $and: [
            { $or: searchCond },
            { 'members.aiId': userAiId }
          ]
        });
      }
    } else {
      activeTeam = memoryTeams.find(t =>
        ( (cleanEvtId && t.eventId === cleanEvtId) || (cleanEvtTitle && t.eventTitle && t.eventTitle.toLowerCase() === cleanEvtTitle) ) &&
        t.members && t.members.some(m => m.aiId && m.aiId.toUpperCase() === userAiId)
      );
    }

    if (activeTeam) {
      return res.status(400).json({
        success: false,
        message: `Action Blocked: You are registered in team '${activeTeam.teamName}' (${activeTeam.teamId}) for '${activeTeam.eventTitle}'. You cannot remove an event registration while part of an active team!`
      });
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

/**
 * POST /cseAI/submit-event-content
 * Submits or updates reel link or poster/paper submission for a registered event
 */
router.post('/submit-event-content', async (req, res) => {
  try {
    const { identifier, eventId, eventTitle, submission } = req.body;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'User identifier is required.' });
    }

    if (!submission) {
      return res.status(400).json({ success: false, message: 'Submission payload is required.' });
    }

    const cleanIdLower = identifier.trim().toLowerCase();
    const cleanIdUpper = identifier.trim().toUpperCase();
    const cleanEvtId = String(eventId || '').trim().toLowerCase();
    const cleanEvtTitle = String(eventTitle || '').trim().toLowerCase();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [
          { email: cleanIdLower },
          { regNo: cleanIdUpper },
          { aiId: cleanIdUpper }
        ]
      });
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanIdLower ||
             u.regNo.toUpperCase() === cleanIdUpper ||
             u.aiId.toUpperCase() === cleanIdUpper
      );
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    if (!user.registeredEvents) {
      user.registeredEvents = [];
    }

    const isMatchEvent = (targetId, targetTitle, e) => {
      const eId = String(e.id || '').trim().toLowerCase();
      const eTitle = String(e.title || '').trim().toLowerCase();
      const tId = String(targetId || '').trim().toLowerCase();
      const tTitle = String(targetTitle || '').trim().toLowerCase();

      // Check domain keyword matches first (prevents Reels matching Hackathon even if both have id='1')
      const isReelsTarget = tTitle.includes('reel') || tId.includes('creative-1');
      const isReelsE = eTitle.includes('reel') || eId.includes('creative-1');
      if (isReelsTarget || isReelsE) return isReelsTarget && isReelsE;

      const isPosterTarget = tTitle.includes('poster') || tTitle.includes('paper') || tId.includes('technical-3');
      const isPosterE = eTitle.includes('poster') || eTitle.includes('paper') || eId.includes('technical-3');
      if (isPosterTarget || isPosterE) return isPosterTarget && isPosterE;

      const isHackTarget = tTitle.includes('hack') || tId.includes('technical-1');
      const isHackE = eTitle.includes('hack') || eId.includes('technical-1');
      if (isHackTarget || isHackE) return isHackTarget && isHackE;

      // Non-numeric direct ID match (e.g. 'creative-1')
      if (tId && eId && tId === eId && !/^[0-9]+$/.test(tId)) return true;

      // Exact title match or normalized title match
      if (tTitle && eTitle) {
        if (tTitle === eTitle || tTitle.includes(eTitle) || eTitle.includes(tTitle)) return true;
        const norm1 = tTitle.replace(/competation/g, 'competition').replace(/[^a-z0-9]/g, '');
        const norm2 = eTitle.replace(/competation/g, 'competition').replace(/[^a-z0-9]/g, '');
        if (norm1 && norm2 && (norm1.includes(norm2) || norm2.includes(norm1))) return true;
      }

      return false;
    };

    // Self-healing: if submitting a reel, clean up any misplaced reel submission on non-reels events (e.g. Hackathon)
    if (submission && (submission.type === 'reels' || submission.reelLink)) {
      user.registeredEvents.forEach(e => {
        const eTitle = (e.title || '').toLowerCase();
        if (!eTitle.includes('reel') && e.id !== 'creative-1' && e.submission && (e.submission.type === 'reels' || e.submission.reelLink)) {
          delete e.submission;
        }
      });
    }

    let eventIdx = user.registeredEvents.findIndex(e => isMatchEvent(cleanEvtId, cleanEvtTitle, e));

    // Check if user has already submitted content for this event (allow file update/overwrite)
    if (eventIdx !== -1) {
      const existingSub = user.registeredEvents[eventIdx].submission;
      if (existingSub && existingSub.submittedBy && existingSub.submittedBy.aiId !== user.aiId) {
        return res.status(400).json({
          success: false,
          message: `Submission Blocked: Your teammate '${existingSub.submittedBy.name}' (${existingSub.submittedBy.aiId}) has already submitted the work for this team.`
        });
      }
    }

    // Check if any teammate has already submitted
    const userAiId = user.aiId ? user.aiId.toUpperCase() : '';
    let activeTeam = null;
    if (mongoose.connection.readyState === 1) {
      activeTeam = await Team.findOne({
        eventId: cleanEvtId,
        'members.aiId': userAiId
      });
      if (!activeTeam && cleanEvtTitle) {
        activeTeam = await Team.findOne({
          eventTitle: { $regex: new RegExp(`^${cleanEvtTitle}$`, 'i') },
          'members.aiId': userAiId
        });
      }
    } else {
      activeTeam = memoryTeams.find(t =>
        ((cleanEvtId && t.eventId === cleanEvtId) || (cleanEvtTitle && t.eventTitle && t.eventTitle.toLowerCase() === cleanEvtTitle)) &&
        t.members && t.members.some(m => m.aiId && m.aiId.toUpperCase() === userAiId)
      );
    }

    if (activeTeam) {
      const memberAiIds = activeTeam.members.map(m => m.aiId.toUpperCase());
      
      // Double check if anyone in the team already has a submission
      let teamUsers = [];
      if (mongoose.connection.readyState === 1) {
        teamUsers = await User.find({ aiId: { $in: memberAiIds } });
      } else {
        teamUsers = memoryUsers.filter(u => u.aiId && memberAiIds.includes(u.aiId.toUpperCase()));
      }

      const alreadySubmittedUser = teamUsers.find(u => {
        if (!u.registeredEvents) return false;
        const match = u.registeredEvents.find(e => isMatchEvent(eventId, eventTitle, e));
        return match && match.submission && (match.submission.reelLink || match.submission.posterFile || match.submission.posterLink);
      });

      if (alreadySubmittedUser) {
        return res.status(400).json({
          success: false,
          message: `Submission Blocked: Your teammate '${alreadySubmittedUser.name}' (${alreadySubmittedUser.aiId}) has already submitted the work for this team.`
        });
      }
    }

    // Save poster file to local disk folder (backend/uploads/posters/) & backup folder (backend/backups/posters/)
    if (submission && submission.posterFile && submission.posterFile.fileData && submission.posterFile.fileData.startsWith('data:')) {
      try {
        const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'posters');
        const backupsDir = BACKUP_POSTERS_DIR;
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

        const matches = submission.posterFile.fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          const extMatch = (submission.posterFile.fileName || '').match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1] : 'png';
          const safeFileName = `${user.aiId || 'USER'}_${cleanEvtId || 'event'}_${Date.now()}.${ext}`;

          const filePath = path.join(uploadsDir, safeFileName);
          const backupFilePath = path.join(backupsDir, safeFileName);

          fs.writeFileSync(filePath, buffer);
          fs.writeFileSync(backupFilePath, buffer);
          console.log('✅ Poster File Saved to Uploads & External Backup:', backupFilePath);

          submission.posterFile.savedDiskPath = `uploads/posters/${safeFileName}`;
          submission.posterFile.serverUrl = `/uploads/posters/${safeFileName}`;
          submission.posterFile.backupPath = backupFilePath;
        }
      } catch (diskErr) {
        console.warn('[Disk Save Warning]', diskErr.message);
      }
    }

    const submissionData = {
      ...submission,
      submittedBy: {
        name: user.name,
        aiId: user.aiId
      },
      submittedAt: new Date().toISOString()
    };

    if (eventIdx !== -1) {
      user.registeredEvents[eventIdx] = {
        ...user.registeredEvents[eventIdx],
        submission: submissionData
      };
    } else {
      // Auto-enroll user if not already in array
      const newEventEntry = {
        id: eventId || 'custom-event',
        title: eventTitle || 'Registered Event',
        categoryName: 'EVENT COMPETITION',
        categoryId: 'custom',
        registeredAt: new Date().toISOString(),
        submission: submissionData
      };
      user.registeredEvents.push(newEventEntry);
    }

    if (mongoose.connection.readyState === 1) {
      user.markModified('registeredEvents');
      await user.save();
    }

    // Sync to all other teammates if in a team
    if (activeTeam) {
      for (const member of activeTeam.members) {
        if (member.aiId.toUpperCase() === userAiId) continue;
        
        if (mongoose.connection.readyState === 1) {
          const memberUser = await User.findOne({ aiId: member.aiId.toUpperCase() });
          if (memberUser && memberUser.registeredEvents) {
            const idx = memberUser.registeredEvents.findIndex(e => {
              const eId = String(e.id || '').trim().toLowerCase();
              const eTitle = String(e.title || '').trim().toLowerCase();
              return (cleanEvtId && eId === cleanEvtId) || (cleanEvtTitle && eTitle === cleanEvtTitle);
            });
            if (idx !== -1) {
              memberUser.registeredEvents[idx].submission = submissionData;
              memberUser.markModified('registeredEvents');
              await memberUser.save();
            }
          }
        } else {
          const memberUser = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === member.aiId.toUpperCase());
          if (memberUser && memberUser.registeredEvents) {
            const idx = memberUser.registeredEvents.findIndex(e => {
              const eId = String(e.id || '').trim().toLowerCase();
              const eTitle = String(e.title || '').trim().toLowerCase();
              return (cleanEvtId && eId === cleanEvtId) || (cleanEvtTitle && eTitle === cleanEvtTitle);
            });
            if (idx !== -1) {
              memberUser.registeredEvents[idx].submission = submissionData;
            }
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Submission saved successfully!',
      registeredEvents: user.registeredEvents
    });

  } catch (error) {
    console.error('[Submission Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during submission.' });
  }
});

export default router;

