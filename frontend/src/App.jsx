import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Search,
  FileText,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  Send,
  Star,
  Tag,
  Calendar,
  User,
  MessageSquare,
  TrendingDown,
  Upload,
  Folder,
  FileArchive,
  Trash2,
  CheckCircle2,
  UploadCloud,
  Sun,
  Moon
} from 'lucide-react';
import './App.css';

const API_BASE = ''; // Relative path works for both proxy and FastAPI hosted static

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ufs_theme') || 'dark';
  });
  const [activeTab, setActiveTab] = useState('themes');
  const [health, setHealth] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [themeDetail, setThemeDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('checkout bugs');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [digest, setDigest] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [feedbackInput, setFeedbackInput] = useState({
    title: '',
    content: '',
    source: 'App Store',
    rating: 1,
    app_version: 'v2.3'
  });
  const [notification, setNotification] = useState('');

  // Synchronize theme with DOM and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ufs_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial load
  useEffect(() => {
    fetchHealth();
    fetchThemes();
    fetchDigest();
  }, []);

  // When themes load, select first theme
  useEffect(() => {
    if (themes.length > 0 && !selectedThemeId) {
      setSelectedThemeId(themes[0].id);
      fetchThemeDetail(themes[0].id);
    }
  }, [themes]);

  // When selected theme changes, fetch details
  useEffect(() => {
    if (selectedThemeId) {
      fetchThemeDetail(selectedThemeId);
    }
  }, [selectedThemeId]);

  // Run initial search
  useEffect(() => {
    handleSearch();
  }, [sourceFilter, ratingFilter]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed', err);
    }
  };

  const fetchThemes = async () => {
    try {
      const res = await fetch(`${API_BASE}/themes`);
      const data = await res.json();
      setThemes(data.themes || []);
    } catch (err) {
      console.error('Themes fetch failed', err);
    }
  };

  const fetchThemeDetail = async (themeId) => {
    try {
      const res = await fetch(`${API_BASE}/themes/${themeId}`);
      const data = await res.json();
      setThemeDetail(data.theme);
    } catch (err) {
      console.error('Theme detail failed', err);
    }
  };

  const fetchDigest = async () => {
    try {
      const res = await fetch(`${API_BASE}/digest?format=json`);
      const data = await res.json();
      setDigest(data);
    } catch (err) {
      console.error('Digest fetch failed', err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    try {
      let url = `${API_BASE}/search?query=${encodeURIComponent(searchQuery || 'checkout')}&limit=15`;
      if (sourceFilter !== 'All') url += `&source_type=${encodeURIComponent(sourceFilter)}`;
      if (ratingFilter !== 'All') {
        url += `&min_rating=${ratingFilter}&max_rating=${ratingFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    try {
      await fetch(`${API_BASE}/synthesize`, { method: 'POST' });
      await fetchThemes();
      if (selectedThemeId) await fetchThemeDetail(selectedThemeId);
      await fetchDigest();
      showNotification('Mental models successfully synthesized via Hindsight!');
    } catch (err) {
      showNotification('Synthesis error: ' + err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackInput.content) return;
    try {
      await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackInput)
      });
      showNotification('Customer feedback retained into memory bank!');
      setFeedbackInput({
        title: '',
        content: '',
        source: 'App Store',
        rating: 1,
        app_version: 'v2.3'
      });
      fetchThemes();
    } catch (err) {
      showNotification('Ingestion error: ' + err.message);
    }
  };

  const handleFilesAdded = (filesList) => {
    const newFiles = Array.from(filesList);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      const res = await fetch(`${API_BASE}/ingest/batch`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      showNotification(`Extracted & retained ${data.total_retained} feedback records from ${data.total_files} file(s)!`);
      setSelectedFiles([]);
      fetchThemes();
    } catch (err) {
      showNotification('Batch upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const totalCitations = themes.reduce((acc, t) => acc + (t.evidence_count || 0), 0);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand-section">
          <div className="logo-badge">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="header-title">User Feedback Synthesizer</h1>
            <p className="header-subtitle">
              Evidence-backed product intelligence powered by <strong>Hindsight</strong> biomimetic memory
            </p>
          </div>
        </div>

        <div className="header-controls">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {health?.hindsight_backend === 'online' ? (
            <span className="badge-live">● Hindsight Server: ONLINE (:8888)</span>
          ) : (
            <span className="badge-offline">○ Hindsight: LOCAL EMBEDDED</span>
          )}

          <button
            className="btn-primary"
            onClick={handleSynthesize}
            disabled={isSynthesizing}
          >
            <Sparkles size={16} className={isSynthesizing ? 'spin' : ''} />
            {isSynthesizing ? 'Synthesizing...' : '⚡ Re-Synthesize'}
          </button>
        </div>
      </header>

      {notification && (
        <div className="notification-banner">
          <Sparkles size={16} />
          {notification}
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="metric-value">75+</div>
            <div className="metric-label">Retained Records</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap">
            <Layers size={22} />
          </div>
          <div>
            <div className="metric-value">{themes.length}</div>
            <div className="metric-label">Standing Themes</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap">
            <FileText size={22} />
          </div>
          <div>
            <div className="metric-value">{totalCitations}</div>
            <div className="metric-label">Evidence Citations</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap">
            <Star size={22} />
          </div>
          <div>
            <div className="metric-value">2.7 / 5.0</div>
            <div className="metric-label">Avg Sentiment</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          <Layers size={17} />
          Synthesized Themes & Drill-down
        </button>

        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={17} />
          Search Feedback (Recall)
        </button>

        <button
          className={`tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingest')}
        >
          <Send size={17} />
          Ingestion Pipeline
        </button>

        <button
          className={`tab-btn ${activeTab === 'digest' ? 'active' : ''}`}
          onClick={() => setActiveTab('digest')}
        >
          <FileText size={17} />
          Weekly PM Digest
        </button>
      </nav>

      {/* TAB 1: THEMES & DRILL-DOWN */}
      {activeTab === 'themes' && (
        <div className="theme-split">
          <div className="theme-list">
            <h3 style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>Standing Themes</h3>
            {themes.map((t) => (
              <div
                key={t.id}
                className={`theme-item ${selectedThemeId === t.id ? 'active' : ''}`}
                onClick={() => setSelectedThemeId(t.id)}
              >
                <div className="theme-item-title">{t.name}</div>
                <div className="theme-item-meta">
                  <span>{t.evidence_count} sources cited</span>
                  <Tag size={12} />
                </div>
              </div>
            ))}
          </div>

          <div className="theme-detail-panel">
            {themeDetail ? (
              <div>
                <div className="theme-detail-header">
                  <h2 className="theme-detail-title">{themeDetail.name}</h2>
                  <p className="theme-detail-query">Query: "{themeDetail.query}"</p>
                  <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Confidence & Grounding:{' '}
                    <span style={{ color: 'var(--success-text)', fontWeight: '600' }}>
                      Strict Directive Enforced ({themeDetail.evidence_count} Sources)
                    </span>
                  </div>
                </div>

                <div className="observation-container">
                  {themeDetail.observation || 'No observation generated yet.'}
                </div>

                <h3 className="section-heading">💬 Verified Customer Quotes</h3>
                {themeDetail.evidence_facts && themeDetail.evidence_facts.length > 0 ? (
                  <div>
                    {themeDetail.evidence_facts.slice(0, 5).map((f, i) => (
                      <div key={i} className="quote-card">
                        <p className="quote-text">"{f.text}"</p>
                        <div className="quote-meta">{f.context}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No quotes cited.</p>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Select a theme from the left to view details.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SEARCH (RECALL) */}
      {activeTab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="search-bar-row">
            <input
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback memories (e.g. checkout bugs, pricing complaints, dark mode)..."
            />

            <select
              className="filter-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="All">All Sources</option>
              <option value="App Store">App Store</option>
              <option value="Google Play">Google Play</option>
              <option value="Zendesk">Zendesk</option>
              <option value="Intercom">Intercom</option>
              <option value="Discord">Discord</option>
              <option value="NPS Survey">NPS Survey</option>
            </select>

            <select
              className="filter-select"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="All">All Ratings</option>
              <option value="1">1 Star</option>
              <option value="2">2 Stars</option>
              <option value="3">3 Stars</option>
              <option value="4">4 Stars</option>
              <option value="5">5 Stars</option>
            </select>

            <button type="submit" className="btn-primary" disabled={isSearching}>
              <Search size={16} />
              {isSearching ? 'Searching...' : 'Recall'}
            </button>
          </form>

          <div className="results-list">
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 10px 0' }}>
              Found <strong>{searchResults.length}</strong> ranked matches in Hindsight memory:
            </p>
            {searchResults.map((r, idx) => (
              <div key={idx} className="result-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="result-title">
                    #{idx + 1}. {r.metadata?.title || r.text.substring(0, 60)}
                  </h4>
                  <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>
                    ★ {r.metadata?.rating || '3'}/5
                  </span>
                </div>
                <p className="result-body">"{r.text}"</p>
                <div className="result-tags">
                  <span>👤 {r.metadata?.user_name || 'Anonymous'}</span>
                  <span>•</span>
                  <span>📱 {r.metadata?.source || 'Channel'}</span>
                  <span>•</span>
                  <span>🏷️ Version: <code>{r.metadata?.app_version || 'N/A'}</code></span>
                  <span>•</span>
                  <span>📅 {(r.timestamp || '').substring(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INGESTION PIPELINE */}
      {activeTab === 'ingest' && (
        <div className="ingest-grid">
          {/* Left Column: Drag & Drop Archives & Folders */}
          <div>
            <h3 className="section-heading">Batch Archive & Folder Upload</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Drag & drop customer support exports (<strong>.zip</strong>), interview transcripts (<strong>.txt, .md</strong>), or feedback dumps (<strong>.csv, .json</strong>).
            </p>

            <div
              className={`drop-zone ${isDragging ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-zone-icon">
                <UploadCloud size={24} />
              </div>
              <div style={{ fontWeight: '600', color: 'var(--text-bold)', fontSize: '14px' }}>
                Drop .zip archives, folders, or CSV/JSON files here
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Auto-extracts nested tickets, transcripts, and reviews
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileArchive size={14} /> Browse Files (.zip, .csv)
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <Folder size={14} /> Choose Folder
                </button>
              </div>

              {/* Hidden file & folder inputs */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".zip,.csv,.json,.txt,.md"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(e.target.files);
                }}
              />
              <input
                type="file"
                ref={folderInputRef}
                webkitdirectory=""
                directory=""
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(e.target.files);
                }}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Staged Files (<strong>{selectedFiles.length}</strong>)
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer' }}
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear All
                  </button>
                </div>

                <div className="file-preview-list">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="file-preview-item">
                      <div className="file-preview-name">
                        {file.name.endsWith('.zip') ? <FileArchive size={16} color="#fbbf24" /> : <FileText size={16} color="#60a5fa" />}
                        <span>{file.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => handleRemoveFile(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                  onClick={handleBatchUpload}
                  disabled={isUploading}
                >
                  <Upload size={16} />
                  {isUploading ? 'Extracting & Retaining...' : `Upload & Retain into Memory (${selectedFiles.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Quick Single Feedback Form */}
          <div>
            <h3 className="section-heading">Quick Single Feedback Entry</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Store an individual customer feedback item into Hindsight using <code>retain()</code> with metadata tags.
            </p>

            <form onSubmit={handleFeedbackSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Title / Summary</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Checkout failed on iOS v2.3"
                  value={feedbackInput.title}
                  onChange={(e) => setFeedbackInput({ ...feedbackInput, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Feedback Content</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Paste verbatim customer review, support ticket, or Slack message..."
                  value={feedbackInput.content}
                  onChange={(e) => setFeedbackInput({ ...feedbackInput, content: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Source Channel</label>
                  <select
                    className="form-control"
                    value={feedbackInput.source}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, source: e.target.value })}
                  >
                    <option value="App Store">App Store</option>
                    <option value="Google Play">Google Play</option>
                    <option value="Zendesk">Zendesk</option>
                    <option value="Intercom">Intercom</option>
                    <option value="Discord">Discord</option>
                    <option value="NPS Survey">NPS Survey</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rating (1 to 5)</label>
                  <select
                    className="form-control"
                    value={feedbackInput.rating}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, rating: Number(e.target.value) })}
                  >
                    <option value={1}>1 Star</option>
                    <option value={2}>2 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={5}>5 Stars</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">App Version</label>
                  <input
                    type="text"
                    className="form-control"
                    value={feedbackInput.app_version}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, app_version: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Send size={16} /> Retain into Hindsight Memory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY PM DIGEST */}
      {activeTab === 'digest' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', margin: '0 0 4px 0', color: 'var(--text-bold)' }}>Executive Product Feedback Digest</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Synthesized via standing mental models and strict evidence grounding.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a href={`${API_BASE}/digest?format=html`} target="_blank" rel="noreferrer" className="btn-secondary">
                <Download size={14} /> View HTML Report
              </a>
              <a href={`${API_BASE}/digest?format=json`} target="_blank" rel="noreferrer" className="btn-secondary">
                <FileText size={14} /> View JSON
              </a>
            </div>
          </div>

          {digest ? (
            <div className="digest-card">
              <h3 className="digest-title">{digest.title}</h3>
              <p className="digest-meta">
                Generated: {digest.date_formatted} | Citations Grounded: <strong>{digest.total_sources_cited}</strong>
              </p>

              {digest.themes?.map((t, idx) => (
                <div key={idx} className="digest-theme-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 className="digest-theme-title">
                      {idx + 1}. {t.name}
                    </h4>
                    <span className="digest-badge">
                      {t.evidence_count} Sources
                    </span>
                  </div>
                  <div className="digest-theme-observation">
                    {t.observation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Loading digest...</p>
          )}
        </div>
      )}
    </div>
  );
}
