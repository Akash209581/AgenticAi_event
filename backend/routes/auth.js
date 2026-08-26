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
import { isEventRegistrationClosed } from '../utils/deadlineValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();



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
    const allowedPasswords = process.env.ADMIN_PASSWORD;

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
 * GET /cseAI/bootcamp-count
 * Returns the total number of students registered for the AI Agent Bootcamp
 */
router.get('/bootcamp-count', async (req, res) => {
  try {
    let newBootcampCount = 0;
    let totalBootcampCount = 0;

    if (mongoose.connection.readyState === 1) {
      totalBootcampCount = await User.countDocuments({
        $or: [
          { 'registeredEvents.id': 'bootcamp-1' },
          { 'registeredEvents.title': /bootcamp/i }
        ]
      });

      newBootcampCount = await User.countDocuments({
        'registeredEvents': {
          $elemMatch: {
            $or: [{ id: 'bootcamp-1' }, { title: /bootcamp/i }],
            isNewBootcampRegistration: true
          }
        }
      });
    } else {
      const bootcampUsers = memoryUsers.filter(u =>
        u.registeredEvents?.some(e => e.id === 'bootcamp-1' || (e.title && e.title.toLowerCase().includes('bootcamp')))
      );
      totalBootcampCount = bootcampUsers.length;
      newBootcampCount = memoryUsers.filter(u =>
        u.registeredEvents?.some(e =>
          (e.id === 'bootcamp-1' || (e.title && e.title.toLowerCase().includes('bootcamp'))) &&
          e.isNewBootcampRegistration === true
        )
      ).length;
    }

    return res.json({
      success: true,
      count: newBootcampCount,
      totalCount: totalBootcampCount,
      limit: 120,
      isClosed: newBootcampCount >= 120
    });
  } catch (error) {
    console.error('[Bootcamp Count Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
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

    const checkTitle = String(event.title || '').toLowerCase();
    const checkEvtId = String(event.id || '').toLowerCase();
    const rawDeadline = event.registrationDeadline || event.deadline || null;
    if (isEventRegistrationClosed(checkEvtId, checkTitle, rawDeadline)) {
      return res.status(400).json({
        success: false,
        message: `Registration for ${event.title || 'this event'} has closed (deadline passed).`
      });
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
      // Check if event is closed for registration (Hackathon, Prompt Combat)
      const checkTitle = String(event.title || cleanTargetTitle || '').toLowerCase();
      const checkEvtId = String(event.id || targetId || '').toLowerCase();
      const isClosed = checkEvtId === 'technical-1' || checkEvtId === 'technical-2' ||
        checkTitle.includes('hackathon') || checkTitle.includes('prompt');
      
      if (isClosed) {
        return res.status(400).json({
          success: false,
          message: `Registration for '${event.title || 'this event'}' has been closed.`
        });
      }

      // Dynamic check for AI Agent Bootcamp: limit to 120 NEW registrations
      const isBootcamp = checkEvtId === 'bootcamp-1' || checkTitle.includes('bootcamp');
      if (isBootcamp) {
        let newBootcampCount = 0;
        if (mongoose.connection.readyState === 1) {
          newBootcampCount = await User.countDocuments({
            'registeredEvents': {
              $elemMatch: {
                $or: [{ id: 'bootcamp-1' }, { title: /bootcamp/i }],
                isNewBootcampRegistration: true
              }
            }
          });
        } else {
          newBootcampCount = memoryUsers.filter(u =>
            u.registeredEvents?.some(e =>
              (e.id === 'bootcamp-1' || (e.title && e.title.toLowerCase().includes('bootcamp'))) &&
              e.isNewBootcampRegistration === true
            )
          ).length;
        }

        if (newBootcampCount >= 120) {
          return res.status(400).json({
            success: false,
            message: `Registration for '${event.title || 'AI Agent Bootcamp'}' has reached the limit of 120 new submissions and is now closed.`
          });
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
        registeredAt: new Date().toISOString(),
        ...(isBootcamp ? { isNewBootcampRegistration: true } : {})
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
      if (cleanEvtId) {
        activeTeam = await Team.findOne({
          eventId: cleanEvtId,
          'members.aiId': userAiId
        });
      } else if (cleanEvtTitle) {
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

    const isClosedEvent = cleanEvtId === 'technical-1' || cleanEvtId === 'technical-2' || cleanEvtId === 'bootcamp-1' ||
      cleanEvtTitle.includes('hackathon') || cleanEvtTitle.includes('prompt') || cleanEvtTitle.includes('bootcamp');
    if (isClosedEvent) {
      return res.status(400).json({
        success: false,
        message: 'Action Blocked: Registrations for this event are closed. Registrations cannot be removed or cancelled.'
      });
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

    // Check if user has already submitted content for this event (allow file update/overwrite or resubmission)
    if (eventIdx !== -1) {
      const existingSub = user.registeredEvents[eventIdx].submission;
      const isResubmitAllowed = existingSub?.reviewStatus === 'RESUBMIT_ALLOWED' || existingSub?.reviewStatus === 'REJECTED' || existingSub?.allowResubmit;
      if (existingSub && existingSub.submittedBy && existingSub.submittedBy.aiId !== user.aiId && !isResubmitAllowed) {
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

      // Double check if anyone in the team already has an active submission that is NOT allowed for resubmission
      let teamUsers = [];
      if (mongoose.connection.readyState === 1) {
        teamUsers = await User.find({ aiId: { $in: memberAiIds } });
      } else {
        teamUsers = memoryUsers.filter(u => u.aiId && memberAiIds.includes(u.aiId.toUpperCase()));
      }

      const alreadySubmittedUser = teamUsers.find(u => {
        if (!u.registeredEvents) return false;
        const match = u.registeredEvents.find(e => isMatchEvent(eventId, eventTitle, e));
        const isResubmitOk = match?.submission?.reviewStatus === 'RESUBMIT_ALLOWED' || match?.submission?.reviewStatus === 'REJECTED' || match?.submission?.allowResubmit;
        return match && match.submission && (match.submission.reelLink || match.submission.posterFile || match.submission.posterLink) && !isResubmitOk;
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

          // Strip heavy base64 fileData to avoid exceeding MongoDB 16MB document limit
          delete submission.posterFile.fileData;
        }
      } catch (diskErr) {
        console.warn('[Disk Save Warning]', diskErr.message);
      }
    }

    // Sanitize resubmission history array to ensure no heavy base64 strings persist
    if (submission && Array.isArray(submission.resubmissionHistory)) {
      submission.resubmissionHistory = submission.resubmissionHistory.map(h => {
        if (!h) return h;
        const entry = { ...h };
        if (entry.posterFile) {
          entry.posterFile = { ...entry.posterFile };
          delete entry.posterFile.fileData;
        }
        if (entry.paperFile) {
          entry.paperFile = { ...entry.paperFile };
          delete entry.paperFile.fileData;
        }
        return entry;
      });
    }

    const submissionData = {
      ...submission,
      submittedBy: {
        name: user.name,
        aiId: user.aiId
      },
      submittedAt: new Date().toISOString()
    };

    // Helper to sanitize registeredEvents and clear leftover heavy fileData
    const purgeHeavyFileData = (events) => {
      if (!Array.isArray(events)) return;
      events.forEach(e => {
        if (e && e.submission) {
          if (e.submission.posterFile && e.submission.posterFile.savedDiskPath) {
            delete e.submission.posterFile.fileData;
          }
          if (e.submission.paperFile && e.submission.paperFile.savedDiskPath) {
            delete e.submission.paperFile.fileData;
          }
          if (Array.isArray(e.submission.resubmissionHistory)) {
            e.submission.resubmissionHistory.forEach(h => {
              if (h && h.posterFile) delete h.posterFile.fileData;
              if (h && h.paperFile) delete h.paperFile.fileData;
            });
          }
        }
      });
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

    purgeHeavyFileData(user.registeredEvents);

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
              purgeHeavyFileData(memberUser.registeredEvents);
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

// ==========================================
// POSTER & PAPER PRESENTATION REVIEWER ROUTES
// ==========================================

/**
 * @route POST /cseAI/reviewer-login
 * @desc Authenticate reviewer / judge panel passkey
 */
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

/**
 * GET /cseAI/user-submission-status?identifier=VUCSE00098
 * Returns the latest registeredEvents for a user so the frontend can refresh review status.
 */
router.get('/user-submission-status', async (req, res) => {
  try {
    const { identifier } = req.query;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'identifier is required' });
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
      }).lean();
    } else {
      user = memoryUsers.find(
        u => u.email.toLowerCase() === cleanIdLower ||
             u.regNo.toUpperCase() === cleanIdUpper ||
             u.aiId.toUpperCase() === cleanIdUpper
      );
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      registeredEvents: user.registeredEvents || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /cseAI/team-details?teamId=TEAM-TECH-3-1234
 * Returns basic team details including members list.
 */
router.get('/team-details', async (req, res) => {
  try {
    const { teamId } = req.query;
    if (!teamId) {
      return res.status(400).json({ success: false, message: 'teamId is required' });
    }

    let team = null;
    if (mongoose.connection.readyState === 1) {
      team = await Team.findOne({ teamId }).lean();
    } else {
      team = memoryTeams.find(t => t.teamId === teamId);
    }

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    return res.json({
      success: true,
      team: {
        teamId: team.teamId,
        teamName: team.teamName,
        eventId: team.eventId,
        eventTitle: team.eventTitle,
        leaderAiId: team.leaderAiId,
        members: team.members.map(m => ({
          aiId: m.aiId,
          name: m.name,
          regNo: m.regNo,
          year: m.year,
          isLeader: m.isLeader
        }))
      }
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
 * @route POST /cseAI/review-submission
 * @desc Approve or Reject poster/paper submission with explanation
 */
router.post('/review-submission', async (req, res) => {
  try {
    const { studentAiId, eventId, eventTitle, status, rejectionReason, reviewerName, resubmissionHistory } = req.body;

    if (!status || !['APPROVED', 'REJECTED', 'PENDING', 'RESUBMIT_ALLOWED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid review status is required (APPROVED, REJECTED, PENDING, or RESUBMIT_ALLOWED).' });
    }

    if ((status === 'REJECTED' || status === 'RESUBMIT_ALLOWED') && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'Explanation/Reason for rejection or resubmission request is required.' });
    }

    const cleanAiId = (studentAiId || '').toUpperCase();
    const cleanEvtId = String(eventId || '').trim().toLowerCase();
    const cleanEvtTitle = String(eventTitle || '').trim().toLowerCase();

    const isMatchEvent = (e) => {
      const eId = String(e.id || '').trim().toLowerCase();
      const eTitle = String(e.title || '').trim().toLowerCase();

      // Keyword domain check (matching submit-event-content)
      const isPosterTarget = cleanEvtTitle.includes('poster') || cleanEvtTitle.includes('paper') || cleanEvtId.includes('technical-3');
      const isPosterE = eTitle.includes('poster') || eTitle.includes('paper') || eId.includes('technical-3');
      if (isPosterTarget || isPosterE) return isPosterTarget && isPosterE;

      const isReelsTarget = cleanEvtTitle.includes('reel') || cleanEvtId.includes('creative-1');
      const isReelsE = eTitle.includes('reel') || eId.includes('creative-1');
      if (isReelsTarget || isReelsE) return isReelsTarget && isReelsE;

      const isHackTarget = cleanEvtTitle.includes('hack') || cleanEvtId.includes('technical-1');
      const isHackE = eTitle.includes('hack') || eId.includes('technical-1');
      if (isHackTarget || isHackE) return isHackTarget && isHackE;

      if (cleanEvtId && eId && cleanEvtId === eId) return true;
      if (cleanEvtTitle && eTitle) {
        if (cleanEvtTitle === eTitle || cleanEvtTitle.includes(eTitle) || eTitle.includes(cleanEvtTitle)) return true;
        const norm1 = cleanEvtTitle.replace(/competation/g, 'competition').replace(/[^a-z0-9]/g, '');
        const norm2 = eTitle.replace(/competation/g, 'competition').replace(/[^a-z0-9]/g, '');
        if (norm1 && norm2 && (norm1.includes(norm2) || norm2.includes(norm1))) return true;
      }

      return false;
    };

    let targetUsers = [];
    let activeTeam = null;
    let logMessages = [];

    logMessages.push(`[${new Date().toISOString()}] Review request for student: ${cleanAiId}, eventId: ${cleanEvtId}, status: ${status}`);

    if (mongoose.connection.readyState === 1) {
      activeTeam = await Team.findOne({
        eventId: cleanEvtId,
        'members.aiId': cleanAiId
      });
      if (activeTeam) {
        logMessages.push(`Found team in DB: ${activeTeam.teamName} with ID: ${activeTeam.teamId}`);
        const teamAiIds = activeTeam.members.map(m => m.aiId.toUpperCase());
        targetUsers = await User.find({ aiId: { $in: teamAiIds } });
        logMessages.push(`Found ${targetUsers.length} team members in DB`);
      } else {
        logMessages.push(`No team found in DB for student ${cleanAiId} and event ${cleanEvtId}. Querying single user.`);
        const singleUser = await User.findOne({ aiId: cleanAiId });
        if (singleUser) {
          targetUsers = [singleUser];
          logMessages.push(`Found single user in DB: ${singleUser.name}`);
        } else {
          logMessages.push(`Single user not found in DB for AI ID: ${cleanAiId}`);
        }
      }
    } else {
      activeTeam = memoryTeams.find(t =>
        t.eventId === cleanEvtId &&
        t.members &&
        t.members.some(m => m.aiId && m.aiId.toUpperCase() === cleanAiId)
      );
      if (activeTeam) {
        logMessages.push(`Found team in memory: ${activeTeam.teamName}`);
        const teamAiIds = activeTeam.members.map(m => m.aiId.toUpperCase());
        targetUsers = memoryUsers.filter(u => u.aiId && teamAiIds.includes(u.aiId.toUpperCase()));
        logMessages.push(`Found ${targetUsers.length} team members in memory`);
      } else {
        logMessages.push(`No team found in memory for student ${cleanAiId} and event ${cleanEvtId}. Querying single user.`);
        const singleUser = memoryUsers.find(u => u.aiId && u.aiId.toUpperCase() === cleanAiId);
        if (singleUser) {
          targetUsers = [singleUser];
          logMessages.push(`Found single user in memory: ${singleUser.name}`);
        } else {
          logMessages.push(`Single user not found in memory for AI ID: ${cleanAiId}`);
        }
      }
    }

    if (targetUsers.length === 0) {
      const errMsg = 'Student submission record not found (targetUsers is empty).';
      logMessages.push(`Error: ${errMsg}`);
      try {
        fs.appendFileSync(path.join(process.cwd(), 'review_debug.log'), logMessages.join('\n') + '\n\n');
      } catch (err) {}
      return res.status(404).json({ success: false, message: errMsg });
    }

    const reviewUpdate = {
      reviewStatus: status,
      rejectionReason: (status === 'REJECTED' || status === 'RESUBMIT_ALLOWED') ? rejectionReason.trim() : '',
      allowResubmit: status === 'RESUBMIT_ALLOWED' || status === 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerName || 'Poster & Paper Reviewer'
    };

    if (Array.isArray(resubmissionHistory)) {
      reviewUpdate.resubmissionHistory = resubmissionHistory.map(h => {
        if (!h) return h;
        const entry = { ...h };
        if (entry.posterFile) {
          entry.posterFile = { ...entry.posterFile };
          delete entry.posterFile.fileData;
        }
        if (entry.paperFile) {
          entry.paperFile = { ...entry.paperFile };
          delete entry.paperFile.fileData;
        }
        return entry;
      });
    }

    // If allowed to resubmit, delete the previous submission files/links so the user starts fresh
    if (status === 'RESUBMIT_ALLOWED') {
      reviewUpdate.posterFile = null;
      reviewUpdate.posterLink = '';
      reviewUpdate.reelLink = '';
    }

    let updatedCount = 0;
    for (const u of targetUsers) {
      if (u.registeredEvents && Array.isArray(u.registeredEvents)) {
        const idx = u.registeredEvents.findIndex(e => isMatchEvent(e));
        if (idx !== -1 && u.registeredEvents[idx].submission) {
          u.registeredEvents[idx].submission = {
            ...u.registeredEvents[idx].submission,
            ...reviewUpdate
          };
          updatedCount++;
          logMessages.push(`Updated user ${u.name} (${u.aiId}) submission at registeredEvents index ${idx}. New status: ${status}`);

          if (mongoose.connection.readyState === 1) {
            if (typeof purgeHeavyFileData === 'function') {
              purgeHeavyFileData(u.registeredEvents);
            }
            u.markModified('registeredEvents');
            await u.save();
            logMessages.push(`Saved user ${u.name} (${u.aiId}) to MongoDB`);
          } else {
            logMessages.push(`Updated user ${u.name} (${u.aiId}) in memory`);
          }
        } else {
          logMessages.push(`User ${u.name} (${u.aiId}) event match status: index=${idx}, hasSubmission=${!!(idx !== -1 && u.registeredEvents[idx].submission)}`);
        }
      } else {
        logMessages.push(`User ${u.name} (${u.aiId}) has no registeredEvents array`);
      }
    }

    logMessages.push(`Finished processing. Updated ${updatedCount} users.`);
    try {
      fs.appendFileSync(path.join(process.cwd(), 'review_debug.log'), logMessages.join('\n') + '\n\n');
    } catch (err) {}

    return res.json({
      success: true,
      message: `Submission marked as ${status} successfully! Updated ${updatedCount} profiles.`,
      reviewUpdate,
      updatedCount
    });
  } catch (err) {
    console.error('[Review Submission Error]', err);
    try {
      fs.appendFileSync(path.join(process.cwd(), 'review_debug.log'), `[ERROR] ${new Date().toISOString()} - ${err.stack}\n\n`);
    } catch (logErr) {}
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /cseAI/view-review-log
 * Serves the review_debug.log file contents for remote debugging.
 */
router.get('/view-review-log', (req, res) => {
  try {
    const logPath = path.join(process.cwd(), 'review_debug.log');
    if (!fs.existsSync(logPath)) {
      return res.send('No review_debug.log file found yet.');
    }
    const content = fs.readFileSync(logPath, 'utf8');
    res.setHeader('Content-Type', 'text/plain');
    return res.send(content);
  } catch (err) {
    return res.status(500).send('Error reading log: ' + err.message);
  }
});

export default router;

