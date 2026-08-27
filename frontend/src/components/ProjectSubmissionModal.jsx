import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Bot, Users, CheckCircle2, AlertCircle, 
  ExternalLink, Github, Globe, Layers, Cpu, ShieldAlert, 
  ListOrdered, HelpCircle, Save, Plus, Trash2, Edit3, Search, 
  Check, Lock, Unlock, ArrowRight
} from 'lucide-react';
import { apiFetch } from '../config/api';

export default function ProjectSubmissionModal({ 
  isOpen, 
  onClose, 
  currentUser = null, 
  initialEvent = null, 
  initialTeam = null,
  onSuccess 
}) {
  const [activeTab, setActiveTab] = useState('verification'); // 'verification' | 'specs' | 'workflow' | 'safety' | 'links'
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Verification & Event State
  const [selectedEventId, setSelectedEventId] = useState('technical-1'); // 'technical-1' | 'industry-2'
  const [leaderIdentifier, setLeaderIdentifier] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedTeam, setVerifiedTeam] = useState(null);

  // Team & Members State
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [members, setMembers] = useState([]);

  // 11 Project Specification Questions + Links State
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
    
    // Resolve initial event
    const eTitle = String(initialEvent?.title || initialTeam?.eventTitle || '').toLowerCase();
    const isExpo = eTitle.includes('expo') || initialEvent?.id === 'industry-2' || initialEvent?.id === '2';
    const initEventId = isExpo ? 'industry-2' : 'technical-1';
    setSelectedEventId(initEventId);

    // If initialTeam provided directly
    if (initialTeam) {
      applyVerifiedTeamData(initialTeam, initialTeam.projectDetails);
      setIsVerified(true);
      setActiveTab('specs');
      setLeaderIdentifier(initialTeam.leaderAiId || '');
    } else if (currentUser) {
      // Pre-fill leader ID from current user if logged in
      const defaultId = currentUser.aiId || currentUser.regNo || '';
      setLeaderIdentifier(defaultId);
      setIsVerified(false);
      setActiveTab('verification');
    } else {
      setLeaderIdentifier('');
      setIsVerified(false);
      setActiveTab('verification');
    }
  }, [isOpen, initialTeam, initialEvent, currentUser]);

  const applyVerifiedTeamData = (team, projectDetails) => {
    setVerifiedTeam(team);
    setTeamId(team.teamId || '');
    setTeamName(team.teamName || '');

    if (Array.isArray(team.members) && team.members.length > 0) {
      setMembers(team.members.map(m => ({
        name: m.name || '',
        regNo: (m.regNo || '').toUpperCase(),
        year: m.year || '3',
        section: m.section || '',
        aiId: m.aiId || '',
        isLeader: Boolean(m.isLeader)
      })));
    } else {
      setMembers([]);
    }

    if (projectDetails) {
      if (projectDetails.agentName) setAgentName(projectDetails.agentName);
      if (projectDetails.problemStatement) setProblemStatement(projectDetails.problemStatement);
      if (projectDetails.targetUsers) setTargetUsers(projectDetails.targetUsers);
      if (projectDetails.userInput) setUserInput(projectDetails.userInput);
      if (projectDetails.informationUsed) setInformationUsed(projectDetails.informationUsed);
      if (projectDetails.decisionsMade) setDecisionsMade(projectDetails.decisionsMade);
      if (projectDetails.toolsNeeded) setToolsNeeded(projectDetails.toolsNeeded);
      if (projectDetails.stepByStepWorkflow) setStepByStepWorkflow(projectDetails.stepByStepWorkflow);
      if (projectDetails.finalResult) setFinalResult(projectDetails.finalResult);
      if (projectDetails.successMetrics) setSuccessMetrics(projectDetails.successMetrics);
      if (projectDetails.failureModesAndChecks) setFailureModesAndChecks(projectDetails.failureModesAndChecks);
      if (projectDetails.githubLink) setGithubLink(projectDetails.githubLink);
      if (projectDetails.demoLink) setDemoLink(projectDetails.demoLink);
    }
  };

  // Verify Leader ID and Event
  const handleVerifyLeader = async (e) => {
    if (e) e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    const cleanId = leaderIdentifier.trim().toUpperCase();
    if (!cleanId) {
      setStatusMsg({
        type: 'error',
        text: 'Please enter Team Leader Registration ID (VU ID) or AI ID.'
      });
      return;
    }

    setVerifying(true);
    try {
      const eventTitle = selectedEventId === 'industry-2' ? 'AI AGENTS EXPO' : 'AGENTIC AI HACKATHON';
      const { data } = await apiFetch(`/project-details?identifier=${encodeURIComponent(cleanId)}&eventId=${selectedEventId}&eventTitle=${encodeURIComponent(eventTitle)}`);

      if (data && data.success && data.team) {
        setIsVerified(true);
        applyVerifiedTeamData(data.team, data.projectDetails);
        setStatusMsg({
          type: 'success',
          text: `✅ Verified! Found registered team "${data.team.teamName}". You can now enter the 11 presentation details.`
        });
      } else {
        setIsVerified(false);
        setVerifiedTeam(null);
        setStatusMsg({
          type: 'error',
          text: data?.message || `No registered team found for "${cleanId}" in ${eventTitle}. Please check the Leader ID or register your team first.`
        });
      }
    } catch (err) {
      console.error('Error verifying team leader:', err);
      setIsVerified(false);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Unable to verify team registration. Please check the Leader ID and selected event.'
      });
    } finally {
      setVerifying(false);
    }
  };

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

    if (!isVerified || !verifiedTeam) {
      setStatusMsg({
        type: 'error',
        text: 'Please verify your registered Team Leader ID before submitting project details.'
      });
      setActiveTab('verification');
      return;
    }

    if (!agentName.trim()) {
      setStatusMsg({ type: 'error', text: 'Agent Name / Problem Statement Title is required.' });
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
      const eventTitle = selectedEventId === 'industry-2' ? 'AI AGENTS EXPO' : 'AGENTIC AI HACKATHON';

      const payload = {
        identifier: leaderIdentifier.trim().toUpperCase(),
        teamId: teamId || verifiedTeam.teamId,
        eventId: selectedEventId,
        eventTitle,
        teamName: teamName.trim() || verifiedTeam.teamName,
        members: members.map(m => ({
          ...m,
          regNo: (m.regNo || '').toUpperCase().trim(),
          name: (m.name || '').trim(),
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
        setStatusMsg({ type: 'success', text: '🎉 Project Presentation Details Saved & Published Successfully!' });
        if (onSuccess) {
          onSuccess(data.projectDetails || payload.projectDetails);
        }
        setTimeout(() => {
          onClose();
        }, 1600);
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

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop show"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 10, 24, 0.88)',
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
          maxWidth: '920px',
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
          background: 'rgba(11, 19, 41, 0.85)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f2fe'
            }}>
              <Bot size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                AI Agent Project Presentation Submission
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Select event, verify team leader ID, and submit the 11 agent specifications
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
            { id: 'verification', label: '1. Event & Team Verification', icon: isVerified ? Check : Lock },
            { id: 'specs', label: '2. Problem & Core Specs', icon: Bot, disabled: !isVerified },
            { id: 'workflow', label: '3. Workflow & Tools', icon: ListOrdered, disabled: !isVerified },
            { id: 'safety', label: '4. Metrics & Safety Checks', icon: ShieldAlert, disabled: !isVerified },
            { id: 'links', label: '5. Repos & Live Demos', icon: Globe, disabled: !isVerified }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1rem',
                  background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #00f2fe' : '2px solid transparent',
                  color: isActive ? '#00f2fe' : isDisabled ? '#475569' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  borderRadius: '6px 6px 0 0',
                  whiteSpace: 'nowrap',
                  opacity: isDisabled ? 0.6 : 1,
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

        {/* Modal Body */}
        <div style={{
          padding: '1.5rem 1.75rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>

          {/* TAB 1: EVENT SELECTION & TEAM LEADER VERIFICATION */}
          {activeTab === 'verification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Step A: Select Event */}
              <div>
                <label style={{ display: 'block', color: '#00f2fe', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Select Event Competition *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventId('technical-1');
                      setIsVerified(false);
                      setVerifiedTeam(null);
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: selectedEventId === 'technical-1' ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedEventId === 'technical-1' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      color: selectedEventId === 'technical-1' ? '#00f2fe' : '#cbd5e1',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <Cpu size={22} color={selectedEventId === 'technical-1' ? '#00f2fe' : '#94a3b8'} />
                    <div>
                      <div>⚡ AGENTIC AI HACKATHON</div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Technical Event Track (4 to 5 Members)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventId('industry-2');
                      setIsVerified(false);
                      setVerifiedTeam(null);
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: selectedEventId === 'industry-2' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedEventId === 'industry-2' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      color: selectedEventId === 'industry-2' ? '#c084fc' : '#cbd5e1',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <Bot size={22} color={selectedEventId === 'industry-2' ? '#c084fc' : '#94a3b8'} />
                    <div>
                      <div>🤖 AI AGENTS EXPO</div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Industry Innovation Track (2 to 4 Members)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step B: Enter Leader VU ID / AI ID */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                borderRadius: '16px',
                padding: '1.25rem'
              }}>
                <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Enter Team Leader Registration ID (VU ID / AI ID) *
                </label>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 0.85rem 0' }}>
                  The system will search the registered team database for this leader under the selected event.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      value={leaderIdentifier}
                      onChange={(e) => {
                        setLeaderIdentifier(e.target.value);
                        if (isVerified) setIsVerified(false);
                      }}
                      placeholder="e.g. CSEAI26001 or 231FA04001"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.6rem',
                        borderRadius: '10px',
                        background: 'rgba(11, 19, 41, 0.9)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: '#00f2fe',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyLeader}
                    disabled={verifying || !leaderIdentifier.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                      border: 'none',
                      color: '#050a18',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: (verifying || !leaderIdentifier.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)'
                    }}
                  >
                    {verifying ? 'Searching...' : 'Verify Team 🔍'}
                  </button>
                </div>
              </div>

              {/* Step C: Verified Team Details Card */}
              {isVerified && verifiedTeam && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ● Verified Registered Team
                      </span>
                      <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: '0.2rem 0 0 0', fontWeight: 700 }}>
                        {verifiedTeam.teamName}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('specs')}
                      style={{
                        padding: '0.5rem 1.25rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                        border: 'none',
                        color: '#050a18',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      Fill 11 Agent Specifications <ArrowRight size={15} />
                    </button>
                  </div>

                  {/* Members Grid */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Registered Team Engineers ({members.length}):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
                      {members.map((mem, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(11, 19, 41, 0.8)',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                            {mem.name} {mem.isLeader && <span style={{ color: '#fbbf24', fontSize: '0.72rem' }}>(Lead)</span>}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            <strong style={{ color: '#00f2fe' }}>{mem.regNo}</strong> | Year {mem.year} {mem.section ? `(${mem.section})` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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

          {/* TAB 4: METRICS & SAFETY CHECKS */}
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
                💡 <strong style={{ color: '#fff' }}>Presentation Ready:</strong> Once published, your presentation slide will appear in the <strong>AI Agent Showcase</strong> for jury members, evaluators, faculty, and student peers to review.
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
            {activeTab !== 'verification' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['verification', 'specs', 'workflow', 'safety', 'links'];
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
            {activeTab !== 'links' && isVerified && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['verification', 'specs', 'workflow', 'safety', 'links'];
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
              disabled={submitting || !isVerified}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                background: isVerified ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: isVerified ? '#050a18' : '#64748b',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: (submitting || !isVerified) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: isVerified ? '0 0 20px rgba(0, 242, 254, 0.4)' : 'none'
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
