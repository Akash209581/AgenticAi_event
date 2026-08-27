/**
 * Event Registration Deadlines & Auto-Closure Validator
 */

export const GENERAL_REGISTRATION_DEADLINE = '26 August 2026';

export const EVENT_DEADLINES = {
  'technical-1': 'closed',          // AGENTIC AI HACKATHON
  'technical-2': 'closed',          // AI PROMPT COMBAT
  'technical-3': '26 August 2026',  // PAPER / POSTER PRESENTATION
  'industry-1': '26 August 2026',   // PODCAST WITH INDUSTRY PROFESSIONALS
  'industry-2': '26 August 2026',   // AI AGENTS EXPO
  'industry-3': '26 August 2026',   // AI SUMMIT - INDUSTRY INTERACTION
  'creative-1': '26 August 2026',   // REELS COMPETITION (AI FOR SOCIETY)
  'creative-2': '26 August 2026',   // AI MUSICAL COMPETITION
  'creative-3': '26 August 2026',   // AGENTIC DAY QUIZ CHALLENGE 2026
  'creative-4': '27 August 2026',   // QUESTX
  'innovative-1': '27 August 2026', // SPARKX
  'bootcamp-1': '18 August 2026'    // AI AGENT BOOTCAMP
};

/**
 * Checks if general user registration / signup is closed based on deadline.
 * @returns {boolean}
 */
export function isGeneralRegistrationClosed() {
  const cleanStr = String(GENERAL_REGISTRATION_DEADLINE).replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(23, 59, 59, 999);
    return Date.now() > parsed.getTime();
  }
  return false;
}

/**
 * Checks if event registration has closed based on date or explicit status.
 * @param {string} eventId 
 * @param {string} eventTitle 
 * @param {string} rawDeadline 
 * @returns {boolean}
 */
export function isEventRegistrationClosed(eventId = '', eventTitle = '', rawDeadline = null) {
  const t = String(eventTitle || '').toLowerCase();
  const id = String(eventId || '').toLowerCase();

  // If explicitly closed in passed deadline string
  if (rawDeadline && String(rawDeadline).toLowerCase().includes('closed')) {
    return true;
  }

  // Find deadline string
  let deadlineStr = rawDeadline;
  if (!deadlineStr) {
    if (EVENT_DEADLINES[id]) {
      deadlineStr = EVENT_DEADLINES[id];
    } else if (t.includes('hackathon') || id === 'technical-1' || (id === '1' && t.includes('hackathon'))) {
      deadlineStr = 'closed';
    } else if (t.includes('prompt') || id === 'technical-2') {
      deadlineStr = 'closed';
    } else if (t.includes('bootcamp') || id === 'bootcamp-1') {
      deadlineStr = '18 August 2026';
    } else {
      // Default fallback deadline for all other events
      deadlineStr = '26 August 2026';
    }
  }

  if (!deadlineStr) return false;

  const lowerDeadline = String(deadlineStr).toLowerCase().trim();
  if (lowerDeadline.includes('closed')) return true;

  // Clean ordinals (18th -> 18, 1st -> 1, etc.)
  const cleanStr = String(deadlineStr).replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(23, 59, 59, 999);
    return Date.now() > parsed.getTime();
  }

  return false;
}
