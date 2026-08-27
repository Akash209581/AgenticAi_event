import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Bot, Users, CheckCircle2, AlertCircle, 
  ExternalLink, Github, Globe, Layers, Cpu, ShieldAlert, 
  ListOrdered, HelpCircle, Save, Plus, Trash2, Edit3 
} from 'lucide-react';
import { apiFetch } from '../config/api';

export default function ProjectSubmissionModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  initialEvent = null, 
  initialTeam = null,
  onSuccess 
}) {
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'specs' | 'workflow' | 'links'
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Event & Team State
  const [eventType, setEventType] = useState('Agentic AI Hackathon');
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [members, setMembers] = useState([]);

  // Project Details State (Matching the 11 Questions + Links)
  const [agentName, setAgentName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [userInput, setUserInput] = useState('');
  const [informationUsed, setInformationUsed] = useState('');
  const [decisionsMade, setDecisionsMade] = useState('');
  const [toolsNeeded, setToolsNeeded] = useState('');
  const [stepByStepWorkflow, setStepByStepWorkflow] = useState('');
  const [finalResult, setFinalResult] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('');
  const [failureModesAndChecks, setFailureModesAndChecks] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [demoLink, setDemoLink] = useState('');

  // Pre-fill on modal open
  useEffect(() => {
    if (!isOpen) return;

    setStatusMsg({ type: '', text: '' });
    setActiveTab('team');

    // 1. Resolve Event Type
    const eTitle = String(initialEvent?.title || initialTeam?.eventTitle || '').toLowerCase();
    const isExpo = eTitle.includes('expo') || initialEvent?.id === 'industry-2' || initialEvent?.id === '2';
    setEventType(isExpo ? 'AI Agent Expo' : 'Agentic AI Hackathon');

    // 2. Resolve Team Name & ID
    if (initialTeam) {
      setTeamId(initialTeam.teamId || '');
      setTeamName(initialTeam.teamName || '');
      if (Array.isArray(initialTeam.members) && initialTeam.members.length > 0) {
        setMembers(initialTeam.members.map(m => ({
          name: m.name || '',
          regNo: (m.regNo || '').toUpperCase(),
          year: m.year || '',
          section: m.section || '',
          aiId: m.aiId || '',
          isLeader: Boolean(m.isLeader)
        })));
      }
      if (initialTeam.projectDetails) {
        const pd = initialTeam.projectDetails;
        if (pd.agentName) setAgentName(pd.agentName);
        if (pd.problemStatement) setProblemStatement(pd.problemStatement);
        if (pd.targetUsers) setTargetUsers(pd.targetUsers);
        if (pd.userInput) setUserInput(pd.userInput);
        if (pd.informationUsed) setInformationUsed(pd.informationUsed);
        if (pd.decisionsMade) setDecisionsMade(pd.decisionsMade);
        if (pd.toolsNeeded) setToolsNeeded(pd.toolsNeeded);
        if (pd.stepByStepWorkflow) setStepByStepWorkflow(pd.stepByStepWorkflow);
        if (pd.finalResult) setFinalResult(pd.finalResult);
        if (pd.successMetrics) setSuccessMetrics(pd.successMetrics);
        if (pd.failureModesAndChecks) setFailureModesAndChecks(pd.failureModesAndChecks);
        if (pd.githubLink) setGithubLink(pd.githubLink);
        if (pd.demoLink) setDemoLink(pd.demoLink);
      }
    } else if (currentUser) {
      // Find registered event
      const regEvt = currentUser.registeredEvents?.find(e => {
        const t = (e.title || '').toLowerCase();
        return t.includes('hackathon') || t.includes('expo');
      });

      if (regEvt) {
        setTeamId(regEvt.teamId || '');
        setTeamName(regEvt.teamName || '');
        if (regEvt.submission?.projectDetails) {
          const pd = regEvt.submission.projectDetails;
          if (pd.agentName) setAgentName(pd.agentName);
          if (pd.problemStatement) setProblemStatement(pd.problemStatement);
          if (pd.targetUsers) setTargetUsers(pd.targetUsers);
          if (pd.userInput) setUserInput(pd.userInput);
          if (pd.informationUsed) setInformationUsed(pd.informationUsed);
          if (pd.decisionsMade) setDecisionsMade(pd.decisionsMade);
          if (pd.toolsNeeded) setToolsNeeded(pd.toolsNeeded);
          if (pd.stepByStepWorkflow) setStepByStepWorkflow(pd.stepByStepWorkflow);
          if (pd.finalResult) setFinalResult(pd.finalResult);
          if (pd.successMetrics) setSuccessMetrics(pd.successMetrics);
          if (pd.failureModesAndChecks) setFailureModesAndChecks(pd.failureModesAndChecks);
          if (pd.githubLink) setGithubLink(pd.githubLink);
          if (pd.demoLink) setDemoLink(pd.demoLink);
        }
      }

      // Fetch from API to get newest team/project details
      const idToFetch = currentUser.aiId || currentUser.regNo;
      if (idToFetch) {
        apiFetch(`/project-details?identifier=${encodeURIComponent(idToFetch)}`)
          .then(({ data }) => {
            if (data && data.success) {
              if (data.team) {
                setTeamId(data.team.teamId || '');
                setTeamName(data.team.teamName || '');
                if (Array.isArray(data.team.members) && data.team.members.length > 0) {
                  setMembers(data.team.members.map(m => ({
                    name: m.name || '',
                    regNo: (m.regNo || '').toUpperCase(),
                    year: m.year || '',
                    section: m.section || '',
                    aiId: m.aiId || '',
                    isLeader: Boolean(m.isLeader)
                  })));
                }
              }
              const pd = data.projectDetails || data.team?.projectDetails;
              if (pd) {
                if (pd.agentName) setAgentName(pd.agentName);
                if (pd.problemStatement) setProblemStatement(pd.problemStatement);
                if (pd.targetUsers) setTargetUsers(pd.targetUsers);
                if (pd.userInput) setUserInput(pd.userInput);
                if (pd.informationUsed) setInformationUsed(pd.informationUsed);
                if (pd.decisionsMade) setDecisionsMade(pd.decisionsMade);
                if (pd.toolsNeeded) setToolsNeeded(pd.toolsNeeded);
                if (pd.stepByStepWorkflow) setStepByStepWorkflow(pd.stepByStepWorkflow);
                if (pd.finalResult) setFinalResult(pd.finalResult);
                if (pd.successMetrics) setSuccessMetrics(pd.successMetrics);
                if (pd.failureModesAndChecks) setFailureModesAndChecks(pd.failureModesAndChecks);
                if (pd.githubLink) setGithubLink(pd.githubLink);
                if (pd.demoLink) setDemoLink(pd.demoLink);
              }
            }
          })
          .catch(() => {});
      }

      // Fallback default members if empty
      setMembers(prev => {
        if (prev.length > 0) return prev;
        return [
          {
            name: currentUser.name || '',
            regNo: (currentUser.regNo || '').toUpperCase(),
            year: currentUser.year || '3',
            section: 'CSE-A',
            aiId: currentUser.aiId || '',
            isLeader: true
          }
        ];
      });
    }
  }, [isOpen, currentUser, initialEvent, initialTeam]);

  if (!isOpen) return null;

  const handleMemberChange = (idx, field, value) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleAddMember = () => {
    if (members.length >= 5) return;
    setMembers(prev => [
      ...prev,
      {
        name: '',
        regNo: '',
        year: '3',
        section: '',
        aiId: '',
        isLeader: false
      }
    ]);
  };

  const handleRemoveMember = (idx) => {
    if (members.length <= 1) return;
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!agentName.trim()) {
      setStatusMsg({ type: 'error', text: 'Agent Name / Problem Title is required.' });
      setActiveTab('specs');
      return;
    }
    if (!problemStatement.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in "What problem should it solve?".' });
      setActiveTab('specs');
      return;
    }

    setSubmitting(true);
    try {
      const eventId = eventType === 'AI Agent Expo' ? 'industry-2' : 'technical-1';
      const eventTitle = eventType === 'AI Agent Expo' ? 'AI AGENTS EXPO' : 'AGENTIC AI HACKATHON';

      const payload = {
        identifier: currentUser?.aiId || currentUser?.regNo || currentUser?.email,
        teamId: teamId || undefined,
        eventId,
        eventTitle,
        teamName: teamName.trim() || `${currentUser?.name || 'Agent'} Team`,
        members: members.map(m => ({
          ...m,
          regNo: m.regNo.toUpperCase().trim(),
          name: m.name.trim(),
          section: (m.section || '').trim().toUpperCase()
        })),
        projectDetails: {
          agentName: agentName.trim(),
          problemStatement: problemStatement.trim(),
          targetUsers: targetUsers.trim(),
          userInput: userInput.trim(),
          informationUsed: informationUsed.trim(),
          decisionsMade: decisionsMade.trim(),
          toolsNeeded: toolsNeeded.trim(),
          stepByStepWorkflow: stepByStepWorkflow.trim(),
          finalResult: finalResult.trim(),
          successMetrics: successMetrics.trim(),
          failureModesAndChecks: failureModesAndChecks.trim(),
          githubLink: githubLink.trim(),
          demoLink: demoLink.trim()
        }
      };

      const { data } = await apiFetch('/submit-project-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (data && data.success) {
        setStatusMsg({ type: 'success', text: '🎉 Project Presentation Details Saved Successfully!' });
        if (onSuccess) {
          onSuccess(data.projectDetails || payload.projectDetails);
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to save project presentation details.' });
      }
    } catch (err) {
      console.error('Submission error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'An error occurred while saving.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="modal-backdrop show"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 10, 24, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        className="cyber-modal-card"
        style={{
          background: 'linear-gradient(145deg, #0b1329, #0f1c3f)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 242, 254, 0.2)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.25s ease-out'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(0, 242, 254, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(11, 19, 41, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f2fe'
            }}>
              <Bot size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                AI Project Presentation & Showcase Form
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Fill out the 11 agent specifications for Expo & Hackathon department presentation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Multi-Section Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '0.5rem 1.5rem 0',
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          {[
            { id: 'team', label: '1. Event & Team', icon: Users },
            { id: 'specs', label: '2. Problem & Core Specs', icon: Bot },
            { id: 'workflow', label: '3. Workflow & Tools', icon: ListOrdered },
            { id: 'safety', label: '4. Metrics & Human Checks', icon: ShieldAlert },
            { id: 'links', label: '5. Repos & Live Demos', icon: Globe }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1rem',
                  background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #00f2fe' : '2px solid transparent',
                  color: isActive ? '#00f2fe' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Alerts */}
        {statusMsg.text && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: statusMsg.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body - Tab Contents */}
        <div style={{
          padding: '1.5rem 1.75rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>

          {/* TAB 1: EVENT & TEAM INFO */}
          {activeTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Event Track *
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {['AI Agent Expo', 'Agentic AI Hackathon'].map(evt => (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => setEventType(evt)}
                        style={{
                          flex: 1,
                          padding: '0.7rem',
                          borderRadius: '10px',
                          border: eventType === evt ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                          background: eventType === evt ? 'rgba(0, 242, 254, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                          color: eventType === evt ? '#00f2fe' : '#cbd5e1',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {evt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Neural Sentinels"
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Team Members List */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                      Team Members Details (For Showcase & Certificate)
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                      Please provide Reg No, Name, Year, and Section for each member
                    </p>
                  </div>
                  {members.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddMember}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(0, 242, 254, 0.15)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: '#00f2fe',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> Add Member
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {members.map((mem, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) auto',
                        gap: '0.6rem',
                        alignItems: 'center',
                        background: 'rgba(11, 19, 41, 0.7)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Reg No *</span>
                        <input
                          type="text"
                          value={mem.regNo}
                          onChange={(e) => handleMemberChange(idx, 'regNo', e.target.value)}
                          placeholder="e.g. 231FA04001"
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#00f2fe',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            padding: '0.2rem 0',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Full Name *</span>
                        <input
                          type="text"
                          value={mem.name}
                          onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                          placeholder="Full Name"
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            padding: '0.2rem 0',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Year</span>
                        <select
                          value={mem.year}
                          onChange={(e) => handleMemberChange(idx, 'year', e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            fontSize: '0.8rem',
                            padding: '0.25rem',
                            outline: 'none'
                          }}
                        >
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="M.Tech (1st year)">M.Tech 1</option>
                          <option value="M.Tech (2nd year)">M.Tech 2</option>
                        </select>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Section</span>
                        <input
                          type="text"
                          value={mem.section}
                          onChange={(e) => handleMemberChange(idx, 'section', e.target.value)}
                          placeholder="e.g. CSE-A"
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#cbd5e1',
                            fontSize: '0.85rem',
                            padding: '0.2rem 0',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.3rem',
                              marginTop: '0.8rem'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROBLEM & CORE SPECS */}
          {activeTab === 'specs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', color: '#00f2fe', fontSize: '0.88rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  1. Agent Name / Problem Statement Title *
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. PulseGuard AI — Autonomous Clinical Triage Agent"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  2. What problem should it solve? *
                </label>
                <textarea
                  rows={3}
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="Clearly explain the real-world pain point or challenge your AI agent addresses..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  3. Who will use it? (Target Audience & Stakeholders)
                </label>
                <textarea
                  rows={2}
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  placeholder="e.g. Hospital triage nurses, emergency medical doctors, rural healthcare workers..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  4. What will users give the agent? (Inputs & Modalities)
                </label>
                <textarea
                  rows={2}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="e.g. Raw vital readings, voice audio notes, scanned medical prescription PDFs, CSV tables..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: WORKFLOW & TOOLS */}
          {activeTab === 'workflow' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  5. What information should it use? (Databases, Knowledge Bases & Telemetry)
                </label>
                <textarea
                  rows={2}
                  value={informationUsed}
                  onChange={(e) => setInformationUsed(e.target.value)}
                  placeholder="e.g. ICD-10 medical ontology, openFDA clinical safety database, hospital EHR records..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  6. What decisions should it make? (Autonomous Logic & Reasoning)
                </label>
                <textarea
                  rows={2}
                  value={decisionsMade}
                  onChange={(e) => setDecisionsMade(e.target.value)}
                  placeholder="e.g. Determines ESI risk triage level (1 to 5), triggers high-priority doctor dispatch, re-routes traffic..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#00f2fe', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  7. Which tools may be needed? (APIs, Frameworks, LLMs & Libraries)
                </label>
                <input
                  type="text"
                  value={toolsNeeded}
                  onChange={(e) => setToolsNeeded(e.target.value)}
                  placeholder="e.g. Gemini 1.5 Pro, LangChain, Twilio API, ChromaDB Vector DB, FastAPI, React"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  8. What should happen step by step? (Agent Execution Pipeline)
                </label>
                <textarea
                  rows={4}
                  value={stepByStepWorkflow}
                  onChange={(e) => setStepByStepWorkflow(e.target.value)}
                  placeholder={"1. Ingest input payload from user\n2. Extract entities and cross-reference knowledge base\n3. Execute reasoning engine & calculate confidence score\n4. Trigger tool executions and API webhooks\n5. Synthesize final structured response"}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  9. What should the final result be? (Output & Deliverable)
                </label>
                <textarea
                  rows={2}
                  value={finalResult}
                  onChange={(e) => setFinalResult(e.target.value)}
                  placeholder="e.g. Live real-time dashboard with automated triage categorization, SMS alerts, and downloadable clinical summary."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: METRICS & HUMAN CHECKS */}
          {activeTab === 'safety' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  10. How will you know it is useful? (Impact & Success Metrics)
                </label>
                <textarea
                  rows={3}
                  value={successMetrics}
                  onChange={(e) => setSuccessMetrics(e.target.value)}
                  placeholder="e.g. Reduces triage turnaround time by 40%, achieved 95% diagnosis alignment with board physicians..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#f87171', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  11. What can go wrong, and what should a person check? (Failure Modes & Human Verification)
                </label>
                <textarea
                  rows={3}
                  value={failureModesAndChecks}
                  onChange={(e) => setFailureModesAndChecks(e.target.value)}
                  placeholder="e.g. Risk of hallucinated contraindications if lab readings are noisy. Human check: Doctor must approve all high-risk medication triggers before dispatch."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 5: REPOS & DEMOS */}
          {activeTab === 'links' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  <Github size={16} /> GitHub / GitLab Repository Link
                </label>
                <input
                  type="url"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/username/project-repo"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#00f2fe',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                  <Globe size={16} /> Live Demo / Deployment Link
                </label>
                <input
                  type="url"
                  value={demoLink}
                  onChange={(e) => setDemoLink(e.target.value)}
                  placeholder="https://your-agent-demo.vercel.app"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#00f2fe',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.82rem',
                color: '#94a3b8',
                lineHeight: 1.5
              }}>
                💡 <strong style={{ color: '#fff' }}>Presentation Tip:</strong> Providing a working deployment link and GitHub repository will allow judges, faculty, and peer visitors to interactively test your AI Agent directly from the Department Presentation Showcase!
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(11, 19, 41, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {activeTab !== 'team' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['team', 'specs', 'workflow', 'safety', 'links'];
                  const prevIdx = tabs.indexOf(activeTab) - 1;
                  if (prevIdx >= 0) setActiveTab(tabs[prevIdx]);
                }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
            )}
            {activeTab !== 'links' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['team', 'specs', 'workflow', 'safety', 'links'];
                  const nextIdx = tabs.indexOf(activeTab) + 1;
                  if (nextIdx < tabs.length) setActiveTab(tabs[nextIdx]);
                }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(0, 242, 254, 0.15)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  color: '#00f2fe',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Next Section →
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#94a3b8',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                border: 'none',
                color: '#050a18',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
              }}
            >
              <Save size={16} />
              {submitting ? 'Saving Presentation...' : 'Save & Publish Presentation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
