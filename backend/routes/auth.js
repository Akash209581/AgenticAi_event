import express from 'express';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { memoryUsers } from '../utils/idGenerator.js';
import { memoryTeams } from './registration.js';
import { getAdminSecretToken } from '../middleware/adminAuth.js';
import mongoose from 'mongoose';

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

    if (!user.registeredEvents) {
      user.registeredEvents = [];
    }

    const cleanEvtId = String(eventId || '').trim().toLowerCase();
    const cleanEvtTitle = String(eventTitle || '').trim().toLowerCase();

    let eventIdx = user.registeredEvents.findIndex(e => {
      const eId = String(e.id || '').trim().toLowerCase();
      const eTitle = String(e.title || '').trim().toLowerCase();
      if (cleanEvtId && eId === cleanEvtId) return true;
      if (cleanEvtTitle && eTitle === cleanEvtTitle) return true;
      if (cleanEvtTitle && (eTitle.includes(cleanEvtTitle) || cleanEvtTitle.includes(eTitle))) return true;
      return false;
    });

    // Check if user has already submitted content for this event
    if (eventIdx !== -1) {
      const existingSub = user.registeredEvents[eventIdx].submission;
      if (existingSub && (existingSub.reelLink || existingSub.posterFile || existingSub.posterLink)) {
        return res.status(400).json({
          success: false,
          message: 'Submission Blocked: You have already submitted your work for this event. Resubmission is not permitted.'
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
        const match = u.registeredEvents.find(e => {
          const eId = String(e.id || '').trim().toLowerCase();
          const eTitle = String(e.title || '').trim().toLowerCase();
          return (cleanEvtId && eId === cleanEvtId) || (cleanEvtTitle && eTitle === cleanEvtTitle);
        });
        return match && match.submission && (match.submission.reelLink || match.submission.posterFile || match.submission.posterLink);
      });

      if (alreadySubmittedUser) {
        return res.status(400).json({
          success: false,
          message: `Submission Blocked: Your teammate '${alreadySubmittedUser.name}' (${alreadySubmittedUser.aiId}) has already submitted the work for this team.`
        });
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

