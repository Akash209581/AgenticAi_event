import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../config/api';
import { secureStorage } from '../utils/secureStorage';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Users,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Layers,
  ChevronRight,
  UserCheck,
  LogOut,
  Eye,
  EyeOff,
  Home,
  CheckCircle2,
  Trash2,
  UserPlus
} from 'lucide-react';

import { eventsRulesData, isSameEvent } from '../data/eventsRulesData';

export default function AdminDashboard({ onBack }) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return secureStorage.getItem('vucse_admin_auth', true) === 'true';
  });
  const [adminUser, setAdminUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Admin Dashboard State
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'events'
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters for All Registrations view
  const [yearFilter, setYearFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected Event state for Event Participants view
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventYearFilter, setEventYearFilter] = useState('all');
  const [eventGenderFilter, setEventGenderFilter] = useState('all');
  const [bootcampBatchFilter, setBootcampBatchFilter] = useState('all');
  const [eventSearch, setEventSearch] = useState('');

  // Team Registrations State
  const [teams, setTeams] = useState([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamEventFilter, setTeamEventFilter] = useState('all');
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Add Member Modal State
  const [selectedTeamForAddMember, setSelectedTeamForAddMember] = useState(null);
  const [newMemberAiId, setNewMemberAiId] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  // Handle Admin Login submission
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setLoginError('Please enter both Admin Username and Password.');
      return;
    }

    setLoginLoading(true);

    try {
      const { res, data } = await apiFetch('/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (data && data.success) {
        setIsAuthenticated(true);
        setAdminUser(data.admin);
        secureStorage.setItem('vucse_admin_auth', 'true', true);
        if (data.token) {
          secureStorage.setItem('vucse_admin_token', data.token, true);
        }
        return;
      }

      // Backend returned failure (e.g., 401 Invalid Credentials)
      setLoginError(data?.message || 'Invalid Username or Password.');
    } catch (err) {
      setLoginError('Unable to connect to server backend. Please ensure backend is running.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminUser(null);
    secureStorage.removeItem('vucse_admin_auth', true);
    secureStorage.removeItem('vucse_admin_token', true);
  };

  // Auto-fill demo admin credentials
  const fillDemoCredentials = () => {
    setLoginForm({ username: 'admin', password: 'admin' });
    setLoginError('');
  };

  // Fetch Stats and Registrations from backend
  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (yearFilter !== 'all') params.append('year', yearFilter);
      if (genderFilter !== 'all') params.append('gender', genderFilter);

      const adminToken = secureStorage.getItem('vucse_admin_token', true) || '';
      const reqHeaders = adminToken ? { 'x-admin-token': adminToken } : {};

      const [{ data: regData }, { data: statsData }] = await Promise.all([
        apiFetch(`/registrations?${params.toString()}`, { headers: reqHeaders }),
        apiFetch('/stats', { headers: reqHeaders })
      ]);

      if (regData.success) {
        setRegistrations(regData.registrations || []);
      } else {
        if (regData.message && (regData.message.includes('Access Denied') || regData.message.includes('Invalid'))) {
          handleLogout();
          setLoginError('Invalid or expired admin credentials. Please login again.');
          return;
        }
        throw new Error(regData.message || 'Failed to fetch registrations');
      }

      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server backend');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Team Registrations from backend
  const fetchTeams = async () => {
    if (!isAuthenticated) return;
    setTeamsLoading(true);
    try {
      const params = new URLSearchParams();
      if (teamSearch.trim()) params.append('search', teamSearch.trim());
      if (teamEventFilter !== 'all') params.append('event', teamEventFilter);

      const adminToken = secureStorage.getItem('vucse_admin_token', true) || '';
      const reqHeaders = adminToken ? { 'x-admin-token': adminToken } : {};

      const { res, data } = await apiFetch(`/team-registrations?${params.toString()}`, { headers: reqHeaders });
      if (data.success) {
        setTeams(data.teams || []);
      }
    } catch (e) {
      console.warn('Error fetching team registrations:', e);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchTeams();
    }
  }, [isAuthenticated, yearFilter, genderFilter, teamSearch, teamEventFilter]);

  // Export CSV for Team Registrations (Flattened Roster: 1 Row per Team Member)
  const exportTeamsPerMemberCSV = () => {
    if (!teams || !teams.length) {
      alert('No team registrations available to export.');
      return;
    }

    const headers = [
      'S.No',
      'Team ID',
      'Team Name',
      'Event Title',
      'Event ID',
      'Member Role',
      'Member Name',
      'VUCSE ID',
      'Registration No',
      'Year',
      'Gender',
      'Phone',
      'Email',
      'Total Team Size',
      'Team Leader Name',
      'Team Leader Phone',
      'Registered Date & Time'
    ];

    const rows = [];
    let serialNo = 1;

    teams.forEach((t) => {
      const leader = (t.members || []).find(m => m.isLeader) || t.members?.[0] || {};
      const members = t.members || [];

      members.forEach((m) => {
        const isLeader = Boolean(m.isLeader || m.aiId === leader.aiId || (m.regNo && m.regNo === leader.regNo));
        rows.push([
          serialNo++,
          t.teamId || '',
          `"${(t.teamName || '').replace(/"/g, '""')}"`,
          `"${(t.eventTitle || '').replace(/"/g, '""')}"`,
          t.eventId || '',
          isLeader ? 'Team Leader' : 'Team Member',
          `"${(m.name || '').replace(/"/g, '""')}"`,
          m.aiId || '',
          m.regNo || '',
          m.year || '',
          m.gender || '',
          m.phone || '',
          m.email || '',
          members.length,
          `"${(leader.name || '').replace(/"/g, '""')}"`,
          leader.phone || '',
          t.createdAt ? `"${new Date(t.createdAt).toLocaleString()}"` : 'N/A'
        ]);
      });
    });

    const safeEventFilter = teamEventFilter === 'all' ? 'All_Teams' : teamEventFilter;
    downloadCSV(headers, rows, `Agentic_AI_Day_Team_Member_Roster_${safeEventFilter}_${Date.now()}.csv`);
  };

  // Export CSV for Team Registrations (Overview: 1 Row per Team)
  const exportTeamsCSV = () => {
    if (!teams || !teams.length) {
      alert('No team registrations available to export.');
      return;
    }

    const headers = [
      'S.No',
      'Team ID',
      'Team Name',
      'Event Title',
      'Event ID',
      'Total Members',
      'Leader Name',
      'Leader AI ID',
      'Leader Reg No',
      'Leader Year',
      'Leader Phone',
      'Leader Email',
      'Member 2 Name',
      'Member 2 AI ID',
      'Member 2 Reg No',
      'Member 2 Year',
      'Member 2 Phone',
      'Member 2 Email',
      'Member 3 Name',
      'Member 3 AI ID',
      'Member 3 Reg No',
      'Member 3 Year',
      'Member 3 Phone',
      'Member 3 Email',
      'Member 4 Name',
      'Member 4 AI ID',
      'Member 4 Reg No',
      'Member 4 Year',
      'Member 4 Phone',
      'Member 4 Email',
      'Member 5 Name',
      'Member 5 AI ID',
      'Member 5 Reg No',
      'Member 5 Year',
      'Member 5 Phone',
      'Member 5 Email',
      'All Members Summary List',
      'Registered Date & Time'
    ];

    const rows = teams.map((t, index) => {
      const leader = (t.members || []).find(m => m.isLeader) || t.members?.[0] || {};
      const nonLeaders = (t.members || []).filter(m => m !== leader && !m.isLeader);
      if (!nonLeaders.length && t.members && t.members.length > 1) {
        nonLeaders.push(...t.members.slice(1));
      }

      const m2 = nonLeaders[0] || {};
      const m3 = nonLeaders[1] || {};
      const m4 = nonLeaders[2] || {};
      const m5 = nonLeaders[3] || {};

      const membersSummary = (t.members || [])
        .map((m, idx) => `${idx + 1}. ${m.name || 'N/A'} (ID: ${m.aiId || '-'}, Reg: ${m.regNo || '-'}, Yr: ${m.year || '-'}${m.isLeader ? ' [Leader]' : ''})`)
        .join('\n')
        .replace(/"/g, '""');

      return [
        index + 1,
        t.teamId || '',
        `"${(t.teamName || '').replace(/"/g, '""')}"`,
        `"${(t.eventTitle || '').replace(/"/g, '""')}"`,
        t.eventId || '',
        t.members ? t.members.length : 0,
        `"${(leader.name || '').replace(/"/g, '""')}"`,
        leader.aiId || t.leaderAiId || '',
        leader.regNo || '',
        leader.year || '',
        leader.phone || '',
        leader.email || '',
        `"${(m2.name || '').replace(/"/g, '""')}"`,
        m2.aiId || '',
        m2.regNo || '',
        m2.year || '',
        m2.phone || '',
        m2.email || '',
        `"${(m3.name || '').replace(/"/g, '""')}"`,
        m3.aiId || '',
        m3.regNo || '',
        m3.year || '',
        m3.phone || '',
        m3.email || '',
        `"${(m4.name || '').replace(/"/g, '""')}"`,
        m4.aiId || '',
        m4.regNo || '',
        m4.year || '',
        m4.phone || '',
        m4.email || '',
        `"${(m5.name || '').replace(/"/g, '""')}"`,
        m5.aiId || '',
        m5.regNo || '',
        m5.year || '',
        m5.phone || '',
        m5.email || '',
        `"${membersSummary}"`,
        t.createdAt ? `"${new Date(t.createdAt).toLocaleString()}"` : 'N/A'
      ];
    });

    const safeEventFilter = teamEventFilter === 'all' ? 'All_Teams' : teamEventFilter;
    downloadCSV(headers, rows, `Agentic_AI_Day_Team_Overview_${safeEventFilter}_${Date.now()}.csv`);
  };

  // Delete / Remove Team Handler for Admin
  const handleDeleteTeam = async (team) => {
    if (!team || !team.teamId) return;
    const confirmMsg = `Are you sure you want to remove Team '${team.teamName}' (${team.teamId}) for '${team.eventTitle}'?\n\nThis will remove the team registration for all ${team.members ? team.members.length : 0} members.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { res, data } = await apiFetch(`/team/${encodeURIComponent(team.teamId)}`, {
        method: 'DELETE'
      });

      if (data.success) {
        alert(data.message || `Team '${team.teamName}' removed successfully.`);
        fetchTeams();
        fetchData();
      } else {
        alert(data.message || 'Failed to remove team.');
      }
    } catch (err) {
      alert('Server error removing team: ' + err.message);
    }
  };

  // Remove individual member from a team
  const handleRemoveMemberFromTeam = async (team, member) => {
    if (!team || !team.teamId || !member || !member.aiId) return;
    const confirmMsg = `Remove member '${member.name}' (${member.aiId}) from Team '${team.teamName}'?${member.isLeader ? '\n\nNote: This member is the Team Leader. Leadership will be reassigned to the next member.' : ''}`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const adminToken = secureStorage.getItem('vucse_admin_token', true) || '';
      const { res, data } = await apiFetch(`/team/${encodeURIComponent(team.teamId)}/remove-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ memberAiId: member.aiId })
      });

      if (data && data.success) {
        alert(data.message || `Member removed successfully.`);
        fetchTeams();
        fetchData();
      } else {
        alert(data.message || 'Failed to remove member.');
      }
    } catch (err) {
      alert('Server error removing team member: ' + err.message);
    }
  };

  // Add a new member to a team
  const handleAddMemberToTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeamForAddMember || !newMemberAiId.trim()) return;

    setAddMemberLoading(true);
    try {
      const adminToken = secureStorage.getItem('vucse_admin_token', true) || '';
      const { res, data } = await apiFetch(`/team/${encodeURIComponent(selectedTeamForAddMember.teamId)}/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ studentAiId: newMemberAiId.trim() })
      });

      if (data && data.success) {
        alert(data.message || `Member added to team successfully.`);
        setSelectedTeamForAddMember(null);
        setNewMemberAiId('');
        fetchTeams();
        fetchData();
      } else {
        alert(data.message || 'Failed to add member to team.');
      }
    } catch (err) {
      alert('Server error adding team member: ' + err.message);
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {

    e.preventDefault();
    fetchData();
  };


  const handleClearFilters = () => {
    setSearch('');
    setYearFilter('all');
    setGenderFilter('all');
    fetchData();
  };

  // Flexible Event Matcher helper
  const isEventMatch = (userEvt, catalogEvt) => {
    if (!userEvt || !catalogEvt) return false;

    // 1. Match by unique categoryId + id if present
    if (userEvt.categoryId && catalogEvt.categoryId &&
      userEvt.categoryId.toLowerCase() === catalogEvt.categoryId.toLowerCase() &&
      String(userEvt.id) === String(catalogEvt.id)) {
      return true;
    }

    // 2. Direct title match
    if (userEvt.title && catalogEvt.title &&
      userEvt.title.trim().toLowerCase() === catalogEvt.title.trim().toLowerCase()) {
      return true;
    }

    // 3. Cleaned title keyword comparison (handles "1.) ", "2.) ", etc.)
    const clean = (str) => String(str || '').replace(/^\d+\.\)\s*/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();
    const uTitle = clean(userEvt.title);
    const cTitle = clean(catalogEvt.title);

    if (uTitle && cTitle) {
      if (uTitle === cTitle) return true;
      const keywords = ['hackathon', 'hackthon', 'prompt combat', 'poster', 'paper', 'podcast', 'expo', 'summit', 'reels', 'musical', 'quiz', 'quest', 'questx', 'spark', 'sparkx', 'bootcamp'];
      for (const kw of keywords) {
        if (uTitle.includes(kw) && cTitle.includes(kw)) {
          return true;
        }
      }
    }

    return false;
  };

  // Official events with distinct category & id definitions
  const officialEventsList = useMemo(() => [
    { id: '1', categoryId: 'technical', categoryName: 'TECHNICAL EVENTS', title: 'AGENTIC AI HACKATHON' },
    { id: '2', categoryId: 'technical', categoryName: 'TECHNICAL EVENTS', title: 'AI PROMPT COMBAT' },
    { id: '3', categoryId: 'technical', categoryName: 'TECHNICAL EVENTS', title: 'PAPER / POSTER PRESENTATION' },
    { id: '1', categoryId: 'industry', categoryName: 'INDUSTRY & INNOVATION', title: 'PODCAST WITH INDUSTRY PROFESSIONALS' },
    { id: '2', categoryId: 'industry', categoryName: 'INDUSTRY & INNOVATION', title: 'AI AGENTS EXPO' },
    { id: '3', categoryId: 'industry', categoryName: 'INDUSTRY & INNOVATION', title: 'AI SUMMIT - INDUSTRY INTERACTION' },
    { id: '1', categoryId: 'creative', categoryName: 'CREATIVE EVENTS', title: 'REELS COMPETITION (AI FOR SOCIETY)' },
    { id: '2', categoryId: 'creative', categoryName: 'CREATIVE EVENTS', title: 'AI MUSICAL COMPETITION' },
    { id: '3', categoryId: 'creative', categoryName: 'CREATIVE EVENTS', title: 'AGENTIC DAY QUIZ CHALLENGE 2026' },
    { id: '4', categoryId: 'creative', categoryName: 'CREATIVE EVENTS', title: 'QUESTX' },
    { id: '1', categoryId: 'innovative', categoryName: 'INNOVATIVE EVENTS', title: 'SPARKX' },
    { id: '1', categoryId: 'bootcamp', categoryName: 'HANDS-ON BOOTCAMP', title: 'AI AGENT BOOTCAMP' }
  ], []);

  // Compute registered participants per event from overall registrations using flexible matching
  const eventParticipantsMap = useMemo(() => {
    const map = {};

    officialEventsList.forEach(catalogEvent => {
      const eventKey = `${catalogEvent.categoryId}-${catalogEvent.id}`;
      const participants = [];

      registrations.forEach(user => {
        if (Array.isArray(user.registeredEvents)) {
          const hasJoined = user.registeredEvents.some(uEvt => isEventMatch(uEvt, catalogEvent));
          if (hasJoined) {
            participants.push(user);
          }
        }
      });

      map[eventKey] = participants;
      map[catalogEvent.title] = participants;
    });

    return map;
  }, [registrations, officialEventsList]);

  // Build a fast lookup map: aiId → team membership info from all fetched teams
  const teamStatusMap = useMemo(() => {
    const map = {};
    (teams || []).forEach(t => {
      (t.members || []).forEach(m => {
        if (m.aiId) {
          map[m.aiId.toUpperCase()] = {
            teamId: t.teamId,
            teamName: t.teamName,
            eventTitle: t.eventTitle,
            isLeader: !!m.isLeader
          };
        }
      });
    });
    return map;
  }, [teams]);

  // Filtered participants for selected event
  const selectedEventData = useMemo(() => {
    if (!selectedEventId) return null;
    const eventObj = officialEventsList.find(e =>
      `${e.categoryId}-${e.id}` === selectedEventId ||
      e.id === selectedEventId ||
      e.title === selectedEventId
    ) || {
      id: selectedEventId,
      title: selectedEventId,
      categoryName: 'EVENT PARTICIPANTS'
    };

    const key = `${eventObj.categoryId}-${eventObj.id}`;
    let rawList = eventParticipantsMap[key] || eventParticipantsMap[eventObj.title] || [];
    const isBootcamp = eventObj.id === 'bootcamp-1' || String(eventObj.title || '').toLowerCase().includes('bootcamp');

    const newCount = isBootcamp
      ? rawList.filter(u =>
          (u.registeredEvents || []).some(e =>
            (e.id === 'bootcamp-1' || String(e.title || '').toLowerCase().includes('bootcamp')) &&
            e.isNewBootcampRegistration === true
          )
        ).length
      : 0;

    const originalCount = isBootcamp ? rawList.length - newCount : rawList.length;

    let filteredList = rawList.filter(user => {
      if (isBootcamp && bootcampBatchFilter !== 'all') {
        const isNew = (user.registeredEvents || []).some(e =>
          (e.id === 'bootcamp-1' || String(e.title || '').toLowerCase().includes('bootcamp')) &&
          e.isNewBootcampRegistration === true
        );
        if (bootcampBatchFilter === 'new' && !isNew) return false;
        if (bootcampBatchFilter === 'original' && isNew) return false;
      }

      if (eventYearFilter !== 'all') {
        const selY = String(eventYearFilter).trim().toLowerCase();
        const uY = String(user.year || '').trim().toLowerCase();
        if (selY === 'mtech') {
          if (!uY.includes('m.tech') && !uY.includes('mtech')) return false;
        } else if (selY.includes('m.tech') || selY.includes('mtech')) {
          if (!uY.includes(selY) && !uY.includes(selY.replace('m.tech', 'mtech'))) return false;
        } else if (uY !== selY) {
          return false;
        }
      }
      if (eventGenderFilter !== 'all' && String(user.gender || 'Unspecified') !== String(eventGenderFilter)) {
        return false;
      }
      if (eventSearch.trim()) {
        const term = eventSearch.trim().toLowerCase();
        const matches =
          (user.name && user.name.toLowerCase().includes(term)) ||
          (user.aiId && user.aiId.toLowerCase().includes(term)) ||
          (user.regNo && user.regNo.toLowerCase().includes(term)) ||
          (user.email && user.email.toLowerCase().includes(term)) ||
          (user.phone && user.phone.includes(term));
        if (!matches) return false;
      }
      return true;
    });

    return {
      event: eventObj,
      isBootcamp,
      rawCount: rawList.length,
      newCount,
      originalCount,
      filteredList
    };
  }, [selectedEventId, eventParticipantsMap, officialEventsList, eventYearFilter, eventGenderFilter, bootcampBatchFilter, eventSearch]);

  // Export CSV for overall registrations
  const exportOverallCSV = () => {
    if (!registrations.length) return;
    const headers = ['VUCSE ID', 'Name', 'Registration No', 'Year', 'Gender', 'DOB (Password)', 'Phone', 'Email', 'Enrolled Events', 'Team Status', 'Team Name', 'Team Event', 'Registration Date & Time'];
    const rows = registrations.map(r => {
      const ts = teamStatusMap[(r.aiId || '').toUpperCase()];
      const regDateTime = r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A';
      return [
        r.aiId,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.regNo,
        r.year || '1',
        r.gender || 'Unspecified',
        r.dob,
        r.phone,
        r.email,
        `"${(r.registeredEvents || []).map(e => e.title).join(' | ').replace(/"/g, '""')}"`,
        ts ? (ts.isLeader ? 'Leader' : 'Member') : 'No Team',
        ts ? `"${(ts.teamName || '').replace(/"/g, '""')}"` : '',
        ts ? `"${(ts.eventTitle || '').replace(/"/g, '""')}"` : '',
        `"${regDateTime}"`
      ];
    });

    downloadCSV(headers, rows, `Agentic_AI_Day_All_Registrations_${Date.now()}.csv`);
  };

  // Export CSV for specific event
  const exportEventCSV = () => {
    if (!selectedEventData || !selectedEventData.filteredList.length) return;
    const headers = ['VUCSE ID', 'Name', 'Registration No', 'Year', 'Gender', 'Phone', 'Email', 'Event Title', 'Bootcamp Phase / Status', 'Event Registration Date & Time', 'Account Registration Date & Time'];
    const rows = selectedEventData.filteredList.map(r => {
      const matchingEv = (r.registeredEvents || []).find(e => isEventMatch(e, selectedEventData.event));
      const eventRegTime = matchingEv?.registeredAt ? new Date(matchingEv.registeredAt).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A');
      const accountCreatedTime = r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A';
      const isBootcamp = selectedEventData.isBootcamp || matchingEv?.id === 'bootcamp-1' || String(matchingEv?.title || '').toLowerCase().includes('bootcamp');
      const bootcampStatus = isBootcamp
        ? (matchingEv?.isNewBootcampRegistration === true ? 'Newly Registered (Phase 2)' : 'Phase 1 Registration')
        : 'N/A';

      return [
        r.aiId,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.regNo,
        r.year || '1',
        r.gender || 'Unspecified',
        r.phone,
        r.email,
        `"${(selectedEventData.event.title || '').replace(/"/g, '""')}"`,
        `"${bootcampStatus}"`,
        `"${eventRegTime}"`,
        `"${accountCreatedTime}"`
      ];
    });

    const safeTitle = selectedEventData.event.title.replace(/[^a-zA-Z0-9]/g, '_');
    downloadCSV(headers, rows, `${safeTitle}_Participants_${Date.now()}.csv`);
  };

  // Export CSV for All Event Enrollments (flattened list of every event registration)
  const exportAllEventsCSV = () => {
    const rows = [];
    registrations.forEach(r => {
      if (Array.isArray(r.registeredEvents) && r.registeredEvents.length > 0) {
        r.registeredEvents.forEach(ev => {
          const eventRegTime = ev.registeredAt ? new Date(ev.registeredAt).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A');
          const accountCreatedTime = r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A';
          const isBootcamp = ev.id === 'bootcamp-1' || String(ev.title || '').toLowerCase().includes('bootcamp');
          const bootcampStatus = isBootcamp
            ? (ev.isNewBootcampRegistration === true ? 'Newly Registered (Phase 2)' : 'Phase 1 Registration')
            : 'N/A';

          rows.push([
            r.aiId,
            `"${(r.name || '').replace(/"/g, '""')}"`,
            r.regNo,
            r.year || '1',
            r.gender || 'Unspecified',
            r.phone,
            r.email,
            `"${(ev.title || ev.cardTitle || '').replace(/"/g, '""')}"`,
            `"${(ev.categoryName || 'TECHNICAL EVENTS').replace(/"/g, '""')}"`,
            `"${bootcampStatus}"`,
            `"${eventRegTime}"`,
            `"${accountCreatedTime}"`
          ]);
        });
      }
    });

    if (!rows.length) {
      alert('No event registrations found to export.');
      return;
    }

    const headers = ['VUCSE ID', 'Name', 'Registration No', 'Year', 'Gender', 'Phone', 'Email', 'Event Title', 'Category', 'Bootcamp Phase / Status', 'Event Registration Date & Time', 'Account Registration Date & Time'];
    downloadCSV(headers, rows, `Agentic_AI_Day_All_Event_Enrollments_${Date.now()}.csv`);
  };

  // Export CSV directly for a catalog event
  const exportSpecificEventCSV = (catalogEvt) => {
    const key = `${catalogEvt.categoryId}-${catalogEvt.id}`;
    const attendees = eventParticipantsMap[key] || eventParticipantsMap[catalogEvt.title] || [];

    if (!attendees.length) {
      alert(`No participants enrolled in ${catalogEvt.title} yet.`);
      return;
    }

    const headers = ['VUCSE ID', 'Name', 'Registration No', 'Year', 'Gender', 'Phone', 'Email', 'Event Title', 'Bootcamp Phase / Status', 'Event Registration Date & Time', 'Account Registration Date & Time'];
    const rows = attendees.map(r => {
      const matchingEv = (r.registeredEvents || []).find(e => isEventMatch(e, catalogEvt));
      const eventRegTime = matchingEv?.registeredAt ? new Date(matchingEv.registeredAt).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A');
      const accountCreatedTime = r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A';
      const isBootcamp = catalogEvt.id === 'bootcamp-1' || String(catalogEvt.title || '').toLowerCase().includes('bootcamp');
      const bootcampStatus = isBootcamp
        ? (matchingEv?.isNewBootcampRegistration === true ? 'Newly Registered (Phase 2)' : 'Phase 1 Registration')
        : 'N/A';

      return [
        r.aiId,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.regNo,
        r.year || '1',
        r.gender || 'Unspecified',
        r.phone,
        r.email,
        `"${(catalogEvt.title || '').replace(/"/g, '""')}"`,
        `"${bootcampStatus}"`,
        `"${eventRegTime}"`,
        `"${accountCreatedTime}"`
      ];
    });

    const safeTitle = catalogEvt.title.replace(/[^a-zA-Z0-9]/g, '_');
    downloadCSV(headers, rows, `${safeTitle}_Participants_${Date.now()}.csv`);
  };

  const downloadCSV = (headers, rows, filename) => {
    const csvLines = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // RENDER 1: ADMIN LOGIN AUTHENTICATION GATE (If not logged in)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at 50% 20%, #0d1527 0%, #040711 70%, #020308 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Cyber Glow Backdrops */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, rgba(168, 85, 247, 0.08) 40%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        {/* Back to Home Button at top */}
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
          <button
            onClick={onBack}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Back to Main App
          </button>
        </div>

        {/* Admin Login Card */}
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 242, 254, 0.15)',
          zIndex: 1,
          textAlign: 'center'
        }}>
          {/* Glowing Shield Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(0, 242, 254, 0.5)',
              padding: '1.2rem',
              borderRadius: '50%',
              boxShadow: '0 0 25px rgba(0, 242, 254, 0.3)'
            }}>
              <ShieldCheck size={42} color="#00f2fe" />
            </div>
          </div>

          <h2 style={{
            fontSize: '1.6rem',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00f2fe, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px'
          }}>
            VUCSE Admin Portal
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.3rem', marginBottom: '1.8rem' }}>
            Enter Administrator Credentials to access full registration analytics & event rosters
          </p>

          {loginError && (
            <div className="toast-banner toast-error" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <AlertCircle size={18} />
              <div style={{ fontSize: '0.85rem' }}>{loginError}</div>
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Username Input */}
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Admin Username
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Enter admin username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="cyber-input"
                  autoComplete="username"
                  required
                />
                <User className="input-icon" size={18} />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Admin Password
              </label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="cyber-input"
                  style={{ paddingRight: '2.5rem' }}
                  autoComplete="current-password"
                  required
                />
                <Lock className="input-icon" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                justifyContent: 'center',
                fontSize: '0.95rem',
                fontWeight: 700,
                marginTop: '0.5rem'
              }}
            >
              {loginLoading ? 'Authenticating...' : 'Authenticate Admin'}
              {!loginLoading && <KeyRound size={18} />}
            </button>
          </form>

          {/* Quick Auto-Fill Demo Credentials Button */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Default Login: <code style={{ color: '#00f2fe' }}>admin</code> / <code style={{ color: '#00f2fe' }}>admin</code>
            </span>
            <button
              type="button"
              onClick={fillDemoCredentials}
              style={{
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                color: '#00f2fe',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Auto Fill
            </button>
          </div>
        </div>

        <div style={{ marginTop: '2rem', color: '#64748b', fontSize: '0.8rem', zIndex: 1 }}>
          Agentic AI Day 2026 • Secure Administration Console
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: FULL SCREEN AUTHENTICATED ADMIN DASHBOARD (When Logged In)
  // =========================================================================
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at 50% 10%, #0a0f1d 0%, #030611 60%, #020308 100%)',
      color: '#f8fafc',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Cyber Mesh & Orbs */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* FULL WIDTH STANDALONE ADMIN NAVIGATION BAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 15, 29, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0, 242, 254, 0.2)',
        padding: '0.8rem 1.5rem',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
            padding: '0.45rem',
            borderRadius: '10px',
            color: '#030712',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontWeight: '900', fontSize: '1.1rem', letterSpacing: '1px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              AGENTIC AI DAY <span style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>ADMIN PORTAL</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={fetchData} className="btn-secondary" title="Refresh Database" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> Refresh Data
          </button>

          <button onClick={exportOverallCSV} className="btn-primary" disabled={!registrations.length} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
            <Download size={16} /> Export All Registrations ({registrations.length})
          </button>

          <button onClick={exportAllEventsCSV} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
            <Download size={16} /> Export All Events CSV
          </button>

          <button onClick={exportTeamsPerMemberCSV} className="btn-primary" disabled={!teams.length} title="Export CSV with 1 row per team member" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #00f2fe, #3b82f6)' }}>
            <Download size={16} /> Export Team Roster (1 Row/Member)
          </button>

          <button onClick={exportTeamsCSV} className="btn-primary" disabled={!teams.length} title="Export summary CSV with 1 row per team" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}>
            <Download size={16} /> Export Team Overview (1 Row/Team)
          </button>

          {selectedEventData && (
            <button onClick={exportEventCSV} className="btn-primary" disabled={!selectedEventData.filteredList.length} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Download size={16} /> Export Event Roster ({selectedEventData.filteredList.length})
            </button>
          )}

          <button onClick={onBack} className="btn-secondary" title="Back to Main Website" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            <Home size={16} /> Main App
          </button>

          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
            title="Logout Admin Session"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* MAIN FULL-SCREEN DASHBOARD CONTENT WRAPPER */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* METRICS & COUNTER CARDS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Total Registered Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(79, 172, 254, 0.05))',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            borderRadius: '16px',
            padding: '1.1rem',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0, 242, 254, 0.15)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Total Attendees
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#00f2fe', margin: '0.2rem 0' }}>
              {stats?.totalRegistrations ?? registrations.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Individual Students</div>
          </div>

          {/* Registered Teams Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.05))',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '16px',
            padding: '1.1rem',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(168, 85, 247, 0.15)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Registered Teams
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#c084fc', margin: '0.2rem 0' }}>
              {teams.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Across 6 Events</div>
          </div>

          {/* 1st Year Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>1st Year</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8', margin: '0.2rem 0' }}>
              {stats?.yearStats?.['1'] ?? registrations.filter(r => String(r.year) === '1').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Students</div>
          </div>

          {/* 2nd Year Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>2nd Year</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8', margin: '0.2rem 0' }}>
              {stats?.yearStats?.['2'] ?? registrations.filter(r => String(r.year) === '2').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Students</div>
          </div>

          {/* 3rd Year Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>3rd Year</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#818cf8', margin: '0.2rem 0' }}>
              {stats?.yearStats?.['3'] ?? registrations.filter(r => String(r.year) === '3').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Students</div>
          </div>

          {/* 4th Year Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>4th Year</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#c084fc', margin: '0.2rem 0' }}>
              {stats?.yearStats?.['4'] ?? registrations.filter(r => String(r.year) === '4').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Students</div>
          </div>
        </div>

        {/* SUBTAB SELECTOR (ALL REGISTRATIONS vs REGISTERED EVENTS vs TEAM REGISTRATIONS) */}
        <div style={{
          display: 'flex',
          gap: '0.8rem',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '0.4rem',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => { setActiveSubTab('all'); setSelectedEventId(null); }}
            style={{
              flex: 1,
              padding: '0.8rem 1.2rem',
              background: activeSubTab === 'all' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.1))' : 'transparent',
              border: activeSubTab === 'all' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
              borderRadius: '10px',
              color: activeSubTab === 'all' ? '#00f2fe' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={18} /> All Registrations ({registrations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('teams')}
            style={{
              flex: 1,
              padding: '0.8rem 1.2rem',
              background: activeSubTab === 'teams' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.15))' : 'transparent',
              border: activeSubTab === 'teams' ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
              borderRadius: '10px',
              color: activeSubTab === 'teams' ? '#c084fc' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={18} /> Team Registrations ({teams.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('events')}
            style={{
              flex: 1,
              padding: '0.8rem 1.2rem',
              background: activeSubTab === 'events' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.1))' : 'transparent',
              border: activeSubTab === 'events' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
              borderRadius: '10px',
              color: activeSubTab === 'events' ? '#00f2fe' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Layers size={18} /> Registered Events ({officialEventsList.length})
          </button>
        </div>

        {error && (
          <div className="toast-banner toast-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={20} />
            <div>{error}</div>
          </div>
        )}

        {/* SUBVIEW 1: ALL REGISTRATIONS TABLE & FILTERS */}
        {activeSubTab === 'all' && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
          }}>
            {/* Filter Toolbar */}
            <div style={{
              background: 'rgba(8, 14, 28, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              alignItems: 'end'
            }}>
              {/* Year Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <GraduationCap size={14} style={{ display: 'inline', marginRight: '4px' }} /> Academic Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="cyber-select"
                  style={{ width: '100%' }}
                >
                  <option value="all">All Academic Years</option>
                  <option value="1">1st Year Only</option>
                  <option value="2">2nd Year Only</option>
                  <option value="3">3rd Year Only</option>
                  <option value="4">4th Year Only</option>
                  <option value="M.Tech (1st year)">M.Tech (1st year)</option>
                  <option value="M.Tech (2nd year)">M.Tech (2nd year)</option>
                  <option value="mtech">All M.Tech (1st & 2nd Year)</option>
                </select>

              </div>

              {/* Gender Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <Users size={14} style={{ display: 'inline', marginRight: '4px' }} /> Gender
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="cyber-select"
                  style={{ width: '100%' }}
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Unspecified">Unspecified</option>
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <Search size={14} style={{ display: 'inline', marginRight: '4px' }} /> Search Participant
                </label>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Name, Reg No, VUCSE ID, Email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="cyber-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    Search
                  </button>
                </form>
              </div>

              {/* Clear button */}
              <div>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Registrations Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
                Loading attendee database entries...
              </div>
            ) : registrations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                No registration records match your search & filter criteria.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>VUCSE ID</th>
                      <th>Name</th>
                      <th>Reg No.</th>
                      <th>Year</th>
                      <th>Gender</th>
                      <th>DOB (Password)</th>
                      <th>Phone</th>
                      <th>Email ID</th>
                      <th>Team Status</th>
                      <th>Enrolled Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((user) => {
                      const ts = teamStatusMap[(user.aiId || '').toUpperCase()];
                      return (
                      <tr key={user.aiId || user._id}>
                        <td>
                          <span className="id-badge">{user.aiId}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{user.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{user.regNo}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(56, 189, 248, 0.3)'
                          }}>
                            {user.year ? (String(user.year).toLowerCase().includes('m') ? user.year : `Yr ${user.year}`) : 'Yr 1'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: user.gender === 'Female' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: user.gender === 'Female' ? '#f472b6' : '#60a5fa',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            {user.gender || 'Unspecified'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{user.dob}</td>
                        <td>{user.phone}</td>
                        <td style={{ color: '#94a3b8' }}>{user.email}</td>
                        <td style={{ textAlign: 'center' }}>
                          {ts ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: ts.isLeader ? 'rgba(251, 191, 36, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                color: ts.isLeader ? '#fbbf24' : '#c084fc',
                                border: ts.isLeader ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)'
                              }}>
                                {ts.isLeader ? '👑 Leader' : '👥 Member'}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ts.teamName}>
                                {ts.teamName}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#475569' }}>—</span>
                          )}
                        </td>
                        <td>
                          {user.registeredEvents && user.registeredEvents.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {user.registeredEvents.map((ev, i) => (
                                <span key={i} style={{
                                  fontSize: '0.7rem',
                                  background: ev.isNewBootcampRegistration ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 242, 254, 0.1)',
                                  color: ev.isNewBootcampRegistration ? '#4ade80' : '#00f2fe',
                                  border: ev.isNewBootcampRegistration ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(0, 242, 254, 0.3)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  {ev.title || ev.cardTitle}
                                  {ev.isNewBootcampRegistration && (
                                    <span style={{ background: '#22c55e', color: '#000', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 800, fontSize: '0.6rem' }}>
                                      PHASE 2
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>None</span>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 2: REGISTERED EVENTS & EVENT PARTICIPANTS ROSTER */}
        {activeSubTab === 'events' && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
          }}>
            {!selectedEventId ? (
              <div>
                <div style={{ marginBottom: '1.25rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Select any event from the catalog below to inspect its participant roster, filter by year/gender, and export CSV.
                </div>

                {/* Grid of official events */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {officialEventsList.map((evt) => {
                    const eventKey = `${evt.categoryId}-${evt.id}`;
                    const attendees = eventParticipantsMap[eventKey] || eventParticipantsMap[evt.title] || [];
                    const count = attendees.length;

                    return (
                      <div
                        key={eventKey}
                        onClick={() => setSelectedEventId(eventKey)}
                        style={{
                          background: 'rgba(8, 14, 28, 0.8)',
                          border: '1px solid rgba(0, 242, 254, 0.25)',
                          borderRadius: '16px',
                          padding: '1.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = '#00f2fe';
                          e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 242, 254, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.25)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
                            {evt.categoryName}
                          </div>
                          <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800, marginBottom: '1rem' }}>
                            {evt.title}
                          </h3>
                        </div>

                        <div style={{
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          paddingTop: '0.8rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <UserCheck size={18} color="#00f2fe" />
                            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#00f2fe' }}>{count}</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Enrolled</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportSpecificEventCSV(evt);
                              }}
                              disabled={!count}
                              style={{
                                background: count ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: count ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: count ? '#00f2fe' : '#64748b',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: count ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              title={count ? `Export CSV for ${evt.title}` : 'No enrollments to export'}
                            >
                              <Download size={13} /> Export CSV
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>
                              Roster <ChevronRight size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* EVENT PARTICIPANT DETAIL ROSTER VIEW */
              <div>
                {/* Event detail header */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.12), rgba(15, 23, 42, 0.9))',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(null)}
                      className="back-link"
                      style={{ marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', fontSize: '0.85rem' }}
                    >
                      <ArrowLeft size={16} /> Back to Event Catalog
                    </button>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {selectedEventData?.event?.categoryName}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: '#00f2fe', fontWeight: 900, marginTop: '0.1rem' }}>
                      {selectedEventData?.event?.title}
                    </h2>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {selectedEventData?.isBootcamp && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          borderRadius: '12px',
                          padding: '0.5rem 0.8rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>🆕 PHASE 2 NEW</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#22c55e' }}>{selectedEventData?.newCount || 0}</div>
                        </div>

                        <div style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '12px',
                          padding: '0.5rem 0.8rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>PHASE 1 ORIGINAL</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8' }}>{selectedEventData?.originalCount || 0}</div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Enrolled</div>
                      <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#00f2fe' }}>
                        {selectedEventData?.rawCount || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Specific Toolbar Filters */}
                <div style={{
                  background: 'rgba(8, 14, 28, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  alignItems: 'end'
                }}>
                  {/* Bootcamp Batch Filter (Only shown for Bootcamp) */}
                  {selectedEventData?.isBootcamp && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#22c55e', marginBottom: '0.4rem', fontWeight: 700 }}>
                        ⚡ Bootcamp Batch
                      </label>
                      <select
                        value={bootcampBatchFilter}
                        onChange={(e) => setBootcampBatchFilter(e.target.value)}
                        className="cyber-select"
                        style={{ width: '100%', borderColor: bootcampBatchFilter === 'new' ? '#22c55e' : 'rgba(0, 242, 254, 0.3)' }}
                      >
                        <option value="all">All Enrolled ({selectedEventData.rawCount})</option>
                        <option value="new">🆕 Newly Registered - Phase 2 ({selectedEventData.newCount})</option>
                        <option value="original">Phase 1 - Original ({selectedEventData.originalCount})</option>
                      </select>
                    </div>
                  )}

                  {/* Year Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                      <GraduationCap size={14} style={{ display: 'inline', marginRight: '4px' }} /> Year Filter
                    </label>
                    <select
                      value={eventYearFilter}
                      onChange={(e) => setEventYearFilter(e.target.value)}
                      className="cyber-select"
                      style={{ width: '100%' }}
                    >
                      <option value="all">All Years</option>
                      <option value="1">1st Year Only</option>
                      <option value="2">2nd Year Only</option>
                      <option value="3">3rd Year Only</option>
                      <option value="4">4th Year Only</option>
                      <option value="M.Tech (1st year)">M.Tech (1st year)</option>
                      <option value="M.Tech (2nd year)">M.Tech (2nd year)</option>
                      <option value="mtech">All M.Tech (1st & 2nd Year)</option>
                    </select>
                  </div>

                  {/* Gender Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                      <Users size={14} style={{ display: 'inline', marginRight: '4px' }} /> Gender Filter
                    </label>
                    <select
                      value={eventGenderFilter}
                      onChange={(e) => setEventGenderFilter(e.target.value)}
                      className="cyber-select"
                      style={{ width: '100%' }}
                    >
                      <option value="all">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Unspecified">Unspecified</option>
                    </select>
                  </div>

                  {/* Event Participant Search */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                      <Search size={14} style={{ display: 'inline', marginRight: '4px' }} /> Search In Event
                    </label>
                    <input
                      type="text"
                      placeholder="Search name, regNo, phone..."
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      className="cyber-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Clear Filters */}
                  <div>
                    <button
                      type="button"
                      onClick={() => { setEventYearFilter('all'); setEventGenderFilter('all'); setBootcampBatchFilter('all'); setEventSearch(''); }}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                {/* Event Participant Table */}
                {selectedEventData?.filteredList?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                    No participants enrolled in this event match the selected filter criteria.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="cyber-table">
                      <thead>
                        <tr>
                          <th>VUCSE ID</th>
                          <th>Name</th>
                          <th>Reg No.</th>
                          <th>Year</th>
                          <th>Gender</th>
                          <th>Phone</th>
                          <th>Email ID</th>
                          <th>Registration Date & Time</th>
                          <th>Batch / Phase</th>
                          <th>Submission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEventData.filteredList.map((user) => {
                          const matchingEv = user.registeredEvents?.find(e => isSameEvent(selectedEventData?.event, e));
                          const evSub = matchingEv?.submission;
                          const regTime = matchingEv?.registeredAt ? new Date(matchingEv.registeredAt).toLocaleString() : (user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A');
                          const isNewBootcampReg = matchingEv?.isNewBootcampRegistration === true;

                          return (
                            <tr key={user.aiId || user._id}>
                              <td>
                                <span className="id-badge">{user.aiId}</span>
                              </td>
                              <td style={{ fontWeight: 600, color: '#f8fafc' }}>{user.name}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{user.regNo}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                <span style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(56, 189, 248, 0.3)'
                                }}>
                                  {user.year ? (String(user.year).toLowerCase().includes('m') ? user.year : `Yr ${user.year}`) : 'Yr 1'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  background: user.gender === 'Female' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                  color: user.gender === 'Female' ? '#f472b6' : '#60a5fa',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}>
                                  {user.gender || 'Unspecified'}
                                </span>
                              </td>
                              <td>{user.phone}</td>
                              <td style={{ color: '#94a3b8' }}>{user.email}</td>
                              <td style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{regTime}</td>
                              <td style={{ textAlign: 'center' }}>
                                {selectedEventData?.isBootcamp ? (
                                  isNewBootcampReg ? (
                                    <span style={{
                                      background: 'rgba(34, 197, 94, 0.15)',
                                      color: '#4ade80',
                                      border: '1px solid rgba(34, 197, 94, 0.4)',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      🆕 Phase 2 (New)
                                    </span>
                                  ) : (
                                    <span style={{
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      color: '#38bdf8',
                                      border: '1px solid rgba(56, 189, 248, 0.3)',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600
                                    }}>
                                      Phase 1 (Original)
                                    </span>
                                  )
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Enrolled</span>
                                )}
                              </td>
                              <td>
                                {evSub?.reelLink ? (
                                  <a
                                    href={evSub.reelLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: 'rgba(251, 191, 36, 0.15)',
                                      border: '1px solid rgba(251, 191, 36, 0.4)',
                                      color: '#fbbf24',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    Watch Reel ↗
                                  </a>
                                ) : evSub?.posterFile ? (
                                  <a
                                    href={evSub.posterFile.fileData || evSub.posterFile.serverUrl || evSub.posterFile.savedDiskPath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={evSub.posterFile.fileName || 'Poster_Submission'}
                                    style={{
                                      background: 'rgba(0, 240, 255, 0.15)',
                                      border: '1px solid rgba(0, 240, 255, 0.4)',
                                      color: '#00f0ff',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    Download File ⬇
                                  </a>
                                ) : evSub?.posterLink ? (
                                  <a
                                    href={evSub.posterLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: 'rgba(0, 240, 255, 0.15)',
                                      border: '1px solid rgba(0, 240, 255, 0.4)',
                                      color: '#00f0ff',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    View Link ↗
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pending</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* SUBVIEW 3: TEAM REGISTRATIONS VIEW */}
        {activeSubTab === 'teams' && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
          }}>
            {/* Header & Filter Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Users style={{ color: '#c084fc' }} size={22} /> REGISTERED COMPETITION TEAMS ({teams.length})
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                  Teams registered across the 9 official Agentic AI Day team event competitions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={exportTeamsPerMemberCSV}
                  className="btn-primary"
                  disabled={!teams.length}
                  style={{ background: 'linear-gradient(135deg, #00f2fe, #3b82f6)', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
                >
                  <Download size={16} /> Export Member Roster (1 Row/Member)
                </button>

                <button
                  type="button"
                  onClick={exportTeamsCSV}
                  className="btn-primary"
                  disabled={!teams.length}
                  style={{ background: 'linear-gradient(135deg, #c084fc, #6366f1)', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
                >
                  <Download size={16} /> Export Team Overview (1 Row/Team)
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{
              background: 'rgba(8, 14, 28, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              alignItems: 'end'
            }}>
              {/* Event Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <Layers size={14} style={{ display: 'inline', marginRight: '4px' }} /> Filter by Event
                </label>
                <select
                  value={teamEventFilter}
                  onChange={(e) => setTeamEventFilter(e.target.value)}
                  className="cyber-select"
                  style={{ width: '100%' }}
                >
                  <option value="all">All 9 Team Events</option>
                  <option value="technical-1">AGENTIC AI HACKATHON</option>
                  <option value="technical-2">AI PROMPT COMBAT</option>
                  <option value="technical-3">PAPER / POSTER PRESENTATION</option>
                  <option value="industry-2">AI AGENTS EXPO</option>
                  <option value="creative-1">REELS COMPETITION (AI FOR SOCIETY)</option>
                  <option value="creative-2">AI MUSICAL COMPETITION</option>
                  <option value="creative-3">AGENTIC DAY QUIZ CHALLENGE 2026</option>
                  <option value="creative-4">QUESTX</option>
                  <option value="innovative-1">SPARKX</option>
                </select>
              </div>

              {/* Team Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  <Search size={14} style={{ display: 'inline', marginRight: '4px' }} /> Search Teams
                </label>
                <input
                  type="text"
                  placeholder="Team Name, Team ID, Student AI ID..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="cyber-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Reset Filters */}
              <div>
                <button
                  type="button"
                  onClick={() => { setTeamSearch(''); setTeamEventFilter('all'); }}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Teams Table */}
            {teamsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#00f2fe' }}>
                Loading Team Registrations...
              </div>
            ) : teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                No registered teams match the selected filter criteria.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Team ID</th>
                      <th>Team Name</th>
                      <th>Event</th>
                      <th>Leader</th>
                      <th style={{ textAlign: 'center' }}>Size</th>
                      <th>All Members Details</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {teams.map((t) => {
                      const leader = (t.members || []).find(m => m.isLeader) || t.members?.[0] || {};
                      return (
                        <tr key={t.teamId || t._id}>
                          <td>
                            <span className="id-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                              {t.teamId}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
                            {t.teamName}
                          </td>
                          <td>
                            <span style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                              {t.eventTitle}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#ffd700' }}>
                              {leader.name || 'Leader'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                              ID: {leader.aiId} • Reg: {leader.regNo}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, color: '#e2e8f0' }}>
                              {t.members ? t.members.length : 0}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '380px' }}>
                              {(t.members || []).map((m, idx) => (
                                <div key={idx} style={{
                                  fontSize: '0.78rem',
                                  background: m.isLeader ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                  border: m.isLeader ? '1px solid rgba(255, 215, 0, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                                    {m.name} <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(Yr {m.year}){m.isLeader ? ' [Leader]' : ''}</span>
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                                      {m.aiId}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMemberFromTeam(t, m)}
                                      title={`Remove ${m.name} from team`}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '0.15rem 0.35rem',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTeamForAddMember(t);
                                  setNewMemberAiId('');
                                }}
                                style={{
                                  marginTop: '0.2rem',
                                  background: 'rgba(168, 85, 247, 0.12)',
                                  border: '1px dashed rgba(168, 85, 247, 0.4)',
                                  color: '#c084fc',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  alignSelf: 'flex-start'
                                }}
                              >
                                <UserPlus size={13} /> + Add Member
                              </button>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeam(t)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s ease'
                              }}
                              title="Remove Team"
                            >
                              <Trash2 size={14} /> Remove Team
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ADD TEAM MEMBER MODAL FOR ADMIN */}
      {selectedTeamForAddMember && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#c084fc', marginTop: 0, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={22} /> ADD MEMBER TO TEAM
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Team: <strong style={{ color: '#ffffff' }}>{selectedTeamForAddMember.teamName}</strong> ({selectedTeamForAddMember.teamId})<br />
              Event: <span style={{ color: '#00f2fe' }}>{selectedTeamForAddMember.eventTitle}</span>
            </p>

            <form onSubmit={handleAddMemberToTeam}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.4rem' }}>
                  STUDENT VUCSE AI ID OR REG NO *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VUCSE202600123 or 2300090000"
                  value={newMemberAiId}
                  onChange={(e) => setNewMemberAiId(e.target.value)}
                  className="cyber-input"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                  required
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Enter the registered student's VUCSE AI ID or Register Number.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedTeamForAddMember(null)}
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberLoading || !newMemberAiId.trim()}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #c084fc, #6366f1)',
                    padding: '0.6rem 1.4rem',
                    fontSize: '0.85rem',
                    opacity: (!newMemberAiId.trim() || addMemberLoading) ? 0.6 : 1
                  }}
                >
                  {addMemberLoading ? 'Adding...' : 'Add Member to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


