import React, { useState, useEffect } from 'react';
import { Users, Search, Download, RefreshCw, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AdminDashboard({ onBack }) {
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRegistrations = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const url = query ? `/cseAI/registrations?search=${encodeURIComponent(query)}` : '/cseAI/registrations';
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch registrations');
      }

      setRegistrations(data.registrations || []);
    } catch (err) {
      setError(err.message || 'Error connecting to database server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations(search);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegistrations(search);
  };

  const exportCSV = () => {
    if (!registrations.length) return;
    const headers = ['AI ID', 'Name', 'DOB', 'Registration No', 'Year', 'Phone', 'Email', 'Registered At'];
    const rows = registrations.map(r => [
      r.aiId,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.dob,
      r.regNo,
      r.year || '1',
      r.phone,
      r.email,
      new Date(r.createdAt || Date.now()).toLocaleString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Agentic_AI_Day_Registrations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="cyber-card">
      {onBack && (
        <div className="back-bar">
          <button onClick={onBack} className="back-link" type="button">
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>
      )}

      <div className="card-header" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="card-title" style={{ justifyContent: 'flex-start' }}>
            <ShieldCheck color="#00f2fe" size={26} />
            Admin Registrations Management
          </h2>
          <p className="card-subtitle">
            Real-time participant database & VUCSE ID tracking starting from VUCSE00001
          </p>
        </div>

        <button onClick={exportCSV} className="btn-secondary" disabled={!registrations.length}>
          <Download size={18} />
          Export CSV ({registrations.length})
        </button>
      </div>

      {/* Toolbar & Search */}
      <form onSubmit={handleSearchSubmit} className="admin-toolbar">
        <div className="search-input-box">
          <input
            type="text"
            placeholder="Search by Name, Reg No, VUCSE ID (e.g. VUCSE00001), Phone, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cyber-input"
            style={{ paddingLeft: '2.8rem' }}
          />
          <Search className="input-icon" size={18} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.2rem' }}>
            Search
          </button>
          <button type="button" onClick={() => { setSearch(''); fetchRegistrations(''); }} className="btn-secondary">
            <RefreshCw size={18} />
          </button>
        </div>
      </form>

      {error && (
        <div className="toast-banner toast-error">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
          Loading registration entries...
        </div>
      ) : registrations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          No registration records found.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Generated VUCSE ID</th>
                <th>Name</th>
                <th>Reg No.</th>
                <th>Year</th>
                <th>DOB (Password)</th>
                <th>Phone (10 Digits)</th>
                <th>Email ID</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((user) => (
                <tr key={user.aiId || user._id}>
                  <td>
                    <span className="id-badge">{user.aiId}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{user.regNo}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{user.year || '1'}</td>
                  <td>{user.dob}</td>
                  <td>{user.phone}</td>
                  <td style={{ color: '#94a3b8' }}>{user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
