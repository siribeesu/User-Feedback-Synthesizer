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
  Moon,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Quote,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import './App.css';
import { resolveInitialTheme, saveTheme, applyThemeToDOM, getStoredTheme } from './theme';

const API_BASE = ''; // Relative path works for both proxy and FastAPI hosted static

export default function App() {
  const [theme, setTheme] = useState(() => {
    return resolveInitialTheme();
  });
  const [activeTab, setActiveTab] = useState('themes');
  const [health, setHealth] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [themeDetail, setThemeDetail] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [digest, setDigest] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedTheme, setCopiedTheme] = useState(false);
  const [copiedQuoteIdx, setCopiedQuoteIdx] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [feedbackInput, setFeedbackInput] = useState({
    title: '',
    content: '',
    source: 'App Store',
    rating: 5,
    app_version: ''
  });
  const [notification, setNotification] = useState('');

  // Synchronize theme with DOM and safe guarded storage
  useEffect(() => {
    applyThemeToDOM(theme);
    saveTheme(theme);
  }, [theme]);

  // Real-time listener for OS preference changes (prefers-color-scheme)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleOSThemeChange = (e) => {
      // If user hasn't explicitly set a custom override, follow OS automatically
      const userChoice = getStoredTheme();
      if (!userChoice) {
        const next = e.matches ? 'dark' : 'light';
        setTheme(next);
        applyThemeToDOM(next);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleOSThemeChange);
      return () => mediaQuery.removeEventListener('change', handleOSThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleOSThemeChange);
      return () => mediaQuery.removeListener(handleOSThemeChange);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHealth(), fetchThemes(), fetchDigest()]);
    setIsRefreshing(false);
  };

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

  // Run search when filters change
  useEffect(() => {
    handleSearch();
  }, [sourceFilter, ratingFilter]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4500);
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
      let url = `${API_BASE}/search?query=${encodeURIComponent(searchQuery || 'feedback')}&limit=15`;
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
      showNotification('Mental models successfully synthesized via Hindsight Biomimetic memory!');
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
      showNotification('Feedback retained into Hindsight memory bank!');
      setFeedbackInput({
        title: '',
        content: '',
        source: 'App Store',
        rating: 5,
        app_version: ''
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
        body: formData
      });
      const data = await res.json();
      showNotification(`Batch processed: Extracted & retained ${data.total_retained || 0} feedback memories!`);
      setSelectedFiles([]);
      fetchThemes();
    } catch (err) {
      showNotification('Batch upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text, type, idx = null) => {
    navigator.clipboard.writeText(text);
    if (type === 'digest') {
      setCopiedDigest(true);
      setTimeout(() => setCopiedDigest(false), 2000);
    } else if (type === 'theme') {
      setCopiedTheme(true);
      setTimeout(() => setCopiedTheme(false), 2000);
    } else if (type === 'quote') {
      setCopiedQuoteIdx(idx);
      setTimeout(() => setCopiedQuoteIdx(null), 2000);
    }
  };

  const totalCitations = themes.reduce((acc, t) => acc + (t.evidence_count || 0), 0);

  // Filtered themes by sidebar query
  const filteredThemes = themes.filter((t) =>
    t.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    (t.query && t.query.toLowerCase().includes(sidebarSearch.toLowerCase()))
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand-section">
          <div className="logo-badge">
            <Brain size={26} />
          </div>
          <div>
            <div className="header-title-row">
              <h1 className="header-title">User Feedback Synthesizer</h1>
              <span className="version-badge">v2.4 Biomimetic</span>
            </div>
            <p className="header-subtitle">
              Evidence-backed product intelligence grounded by <strong>Hindsight</strong> memory banks
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
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={refreshAllData}
            title="Refresh All Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>Sync</span>
          </button>

          {health?.hindsight_backend === 'online' ? (
            <span className="badge-live">
              <span className="pulse-dot" style={{ background: '#10b981' }}></span>
              Hindsight: ONLINE (:8888)
            </span>
          ) : (
            <span className="badge-offline">
              <span className="pulse-dot" style={{ background: '#f59e0b' }}></span>
              Hindsight: LOCAL EMBEDDED
            </span>
          )}

          <button
            className="btn-primary"
            onClick={handleSynthesize}
            disabled={isSynthesizing}
          >
            <Sparkles size={16} className={isSynthesizing ? 'spin' : ''} />
            {isSynthesizing ? 'Synthesizing...' : '⚡ Run Synthesis'}
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="notification-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} />
            <span>{notification}</span>
          </div>
          <button
            className="btn-ghost"
            style={{ color: 'inherit', padding: '2px 6px' }}
            onClick={() => setNotification('')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Executive KPI Metric Strip */}
      <div className="metrics-grid">
        <div className="metric-card accent-blue">
          <div className="metric-card-content">
            <div className="metric-label">Retained Records</div>
            <div className="metric-value">{health?.retained_count ?? 0}</div>
            <div className="metric-subtext">
              <CheckCircle2 size={13} color="var(--accent)" />
              {health?.retained_count ? 'Multi-channel support' : 'Ready for ingestion'}
            </div>
          </div>
          <div className="metric-icon-wrap blue">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="metric-card accent-purple">
          <div className="metric-card-content">
            <div className="metric-label">Standing Themes</div>
            <div className="metric-value">{themes.length}</div>
            <div className="metric-subtext">
              <ShieldCheck size={13} color="var(--purple)" /> 100% Directive Enforced
            </div>
          </div>
          <div className="metric-icon-wrap purple">
            <Layers size={22} />
          </div>
        </div>

        <div className="metric-card accent-green">
          <div className="metric-card-content">
            <div className="metric-label">Evidence Citations</div>
            <div className="metric-value">{totalCitations}</div>
            <div className="metric-subtext">
              <CheckCircle2 size={13} color="var(--success-text)" /> Strictly Grounded
            </div>
          </div>
          <div className="metric-icon-wrap green">
            <FileText size={22} />
          </div>
        </div>

        <div className="metric-card accent-amber">
          <div className="metric-card-content">
            <div className="metric-label">Release Sentiment</div>
            <div className="metric-value">
              {health?.retained_count && health?.avg_rating ? `${health.avg_rating} / 5.0` : '-- / 5.0'}
            </div>
            <div className="metric-subtext" style={{ color: 'var(--text-muted)' }}>
              {health?.retained_count ? 'Average rating from customer input' : 'Awaiting feedback ingestion'}
            </div>
          </div>
          <div className="metric-icon-wrap amber">
            <Star size={22} />
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          <Layers size={17} />
          Synthesized Themes & Drill-down
          <span className="tab-counter">{themes.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={17} />
          Feedback Recall & Explorer
          {searchResults.length > 0 && <span className="tab-counter">{searchResults.length}</span>}
        </button>

        <button
          className={`tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingest')}
        >
          <Upload size={17} />
          Ingestion Pipeline
          {selectedFiles.length > 0 && <span className="tab-counter">{selectedFiles.length} staged</span>}
        </button>

        <button
          className={`tab-btn ${activeTab === 'digest' ? 'active' : ''}`}
          onClick={() => setActiveTab('digest')}
        >
          <FileText size={17} />
          Executive PM Digest
        </button>
      </nav>

      {/* TAB 1: THEMES & DRILL-DOWN */}
      {activeTab === 'themes' && (
        <div className="theme-split">
          {/* Left Theme Sidebar */}
          <div className="theme-sidebar">
            <div className="theme-sidebar-header">
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-bold)', margin: 0 }}>
                Standing Mental Models ({filteredThemes.length})
              </h3>
            </div>

            <input
              type="text"
              className="theme-search-input"
              placeholder="Filter standing themes..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />

            <div className="theme-list">
              {filteredThemes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No standing themes yet. Ingest feedback in the "Ingestion Pipeline" tab and click "⚡ Run Synthesis".
                </div>
              ) : (
                filteredThemes.map((t) => (
                  <div
                    key={t.id}
                    className={`theme-item ${selectedThemeId === t.id ? 'active' : ''}`}
                    onClick={() => setSelectedThemeId(t.id)}
                  >
                    <div className="theme-item-top">
                      <h4 className="theme-item-title">{t.name}</h4>
                    </div>
                    <div className="theme-item-meta">
                      <span className="citation-pill">{t.evidence_count} citations</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Strict Directive
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Theme Detail View */}
          <div className="theme-detail-panel">
            {themeDetail ? (
              <div>
                <div className="theme-detail-header">
                  <div className="theme-detail-top-row">
                    <div>
                      <h2 className="theme-detail-title">{themeDetail.name}</h2>
                      <div className="theme-detail-query-box">
                        <strong>Hindsight Mental Model Query:</strong> "{themeDetail.query}"
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => copyToClipboard(themeDetail.observation, 'theme')}
                    >
                      {copiedTheme ? <Check size={14} color="var(--success-text)" /> : <Copy size={14} />}
                      <span>{copiedTheme ? 'Copied!' : 'Copy Analysis'}</span>
                    </button>
                  </div>

                  <div className="theme-grounding-chip">
                    <ShieldCheck size={14} />
                    Strict Grounding Directive Enforced ({themeDetail.evidence_count} Verified Sources)
                  </div>
                </div>

                <div className="observation-container">
                  {themeDetail.observation || 'No observation generated yet.'}
                </div>

                <div className="section-heading-row">
                  <h3 className="section-heading">
                    <Quote size={18} color="var(--accent)" />
                    Verified Customer Quotes Grounding This Theme
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Showing top {Math.min(5, themeDetail.evidence_facts?.length || 0)} citations
                  </span>
                </div>

                {themeDetail.evidence_facts && themeDetail.evidence_facts.length > 0 ? (
                  <div className="quotes-list">
                    {themeDetail.evidence_facts.slice(0, 5).map((f, i) => (
                      <div key={i} className="quote-card">
                        <p className="quote-text">"{f.text}"</p>
                        <div className="quote-footer">
                          <span className="quote-context">
                            <Tag size={12} color="var(--accent)" />
                            {f.context}
                          </span>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => copyToClipboard(f.text, 'quote', i)}
                            title="Copy Quote"
                          >
                            {copiedQuoteIdx === i ? <Check size={12} color="var(--success-text)" /> : <Copy size={12} />}
                            <span>{copiedQuoteIdx === i ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No quotes cited for this model.</p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Layers size={44} style={{ opacity: 0.4, marginBottom: '14px' }} />
                <h3 style={{ color: 'var(--text-bold)', fontSize: '18px', margin: '0 0 8px 0' }}>No Theme Selected</h3>
                <p style={{ fontSize: '13.5px', maxWidth: '440px', margin: '0 auto' }}>
                  Upload customer feedback in the <strong>Ingestion Pipeline</strong> tab, then click <strong>⚡ Run Synthesis</strong> to extract evidence-backed themes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FEEDBACK RECALL & SEARCH */}
      {activeTab === 'search' && (
        <div className="search-container">
          <form onSubmit={handleSearch} className="search-bar-row">
            <div className="search-input-wrapper">
              <Search size={18} className="search-input-icon" />
              <input
                type="text"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search raw feedback memories by keyword, topic, or channel..."
              />
            </div>

            <select
              className="filter-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="All">All Channels</option>
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
              <option value="1">1 Star Only (Defects)</option>
              <option value="2">2 Stars</option>
              <option value="3">3 Stars</option>
              <option value="4">4 Stars</option>
              <option value="5">5 Stars (Praise)</option>
            </select>

            <button type="submit" className="btn-primary" disabled={isSearching}>
              <Search size={16} />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="quick-filter-chips">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Quick Filters:</span>
            {[
              { label: '⭐ 1-Star (Defects)', query: 'rating:1' },
              { label: '⭐ 5-Star (Praise)', query: 'rating:5' },
              { label: '📱 Mobile App', query: 'mobile' },
              { label: '💬 Support Tickets', query: 'ticket' }
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className={`quick-chip ${searchQuery === chip.query ? 'active' : ''}`}
                onClick={() => {
                  setSearchQuery(chip.query);
                  setTimeout(() => handleSearch(), 50);
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="results-header">
            <span>
              Showing <strong>{searchResults.length}</strong> matching feedback items
            </span>
            <span>Sorted by Biomimetic Semantic Relevance</span>
          </div>

          <div className="results-list">
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <Search size={36} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--text-bold)', margin: '0 0 6px 0' }}>No Feedback Records Found</h4>
                <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto' }}>
                  No feedback records match this query. Ingest feedback in the <strong>Ingestion Pipeline</strong> tab first.
                </p>
              </div>
            ) : (
              searchResults.map((r, idx) => (
                <div key={idx} className="result-card">
                  <div className="result-card-top">
                    <h4 className="result-title">
                      {r.metadata?.title || `Feedback Record #${idx + 1}`}
                    </h4>
                    <div className="result-rating-stars">
                      {'★'.repeat(r.metadata?.rating || 1)}
                      {'☆'.repeat(5 - (r.metadata?.rating || 1))}
                    </div>
                  </div>

                  <p className="result-body">{r.text}</p>

                  <div className="result-tags">
                    <span className="channel-badge">{r.metadata?.source || 'Channel'}</span>
                    <span>👤 {r.metadata?.user_name || 'Anonymous User'}</span>
                    <span>•</span>
                    <span>🏷️ Version: <code>{r.metadata?.app_version || 'N/A'}</code></span>
                    <span>•</span>
                    <span>📅 {(r.timestamp || '').substring(0, 10)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INGESTION PIPELINE */}
      {activeTab === 'ingest' && (
        <div className="ingest-grid">
          {/* Left Column: Drag & Drop Archives & Folders */}
          <div className="ingest-card-panel">
            <h3 className="section-heading" style={{ marginBottom: '6px' }}>
              <UploadCloud size={20} color="var(--accent)" />
              Batch Archive & Folder Ingestion
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>
              Drop customer support exports, interview transcripts, or feedback dumps into memory.
            </p>

            <div
              className={`drop-zone ${isDragging ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-zone-icon">
                <UploadCloud size={28} />
              </div>
              <h4 className="drop-zone-title">
                Drag & Drop .zip archives, folders, or CSV/JSON files here
              </h4>
              <p className="drop-zone-desc">
                Supports batch unpacking of nested interview notes and ticket exports
              </p>

              <div className="format-tags">
                <span className="format-pill">.ZIP</span>
                <span className="format-pill">.CSV</span>
                <span className="format-pill">.JSON</span>
                <span className="format-pill">.TXT</span>
                <span className="format-pill">.MD</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 14px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileArchive size={14} /> Browse Archives / Files
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 14px' }}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <Folder size={14} /> Choose Entire Folder
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
              <div style={{ marginTop: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-bold)' }}>
                    Staged for Ingestion (<strong>{selectedFiles.length}</strong>)
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear All
                  </button>
                </div>

                <div className="file-preview-list">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="file-preview-item">
                      <div className="file-preview-name">
                        {file.name.endsWith('.zip') ? <FileArchive size={16} color="#fbbf24" /> : <FileText size={16} color="var(--accent)" />}
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
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                  onClick={handleBatchUpload}
                  disabled={isUploading}
                >
                  <Upload size={16} />
                  {isUploading ? 'Extracting & Retaining into Memory...' : `Upload & Retain (${selectedFiles.length} files)`}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Quick Single Feedback Form */}
          <div className="ingest-card-panel">
            <h3 className="section-heading" style={{ marginBottom: '6px' }}>
              <Send size={18} color="var(--accent)" />
              Quick Single Feedback Ingestion
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>
              Store individual verbatim customer feedback using Hindsight's <code>retain()</code> API.
            </p>

            <form onSubmit={handleFeedbackSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Feedback Title / Summary</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. App navigation freezes after recent update"
                  value={feedbackInput.title}
                  onChange={(e) => setFeedbackInput({ ...feedbackInput, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Verbatim Feedback Content</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Paste verbatim customer review, support ticket description, or user interview note..."
                  value={feedbackInput.content}
                  onChange={(e) => setFeedbackInput({ ...feedbackInput, content: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Channel Source</label>
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
                  <label className="form-label">Customer Rating</label>
                  <div className="star-rating-selector">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        className={`star-btn ${starVal <= feedbackInput.rating ? 'active' : ''}`}
                        onClick={() => setFeedbackInput({ ...feedbackInput, rating: starVal })}
                      >
                        ★
                      </button>
                    ))}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      ({feedbackInput.rating}/5)
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">App Release Version</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. v1.0.0"
                    value={feedbackInput.app_version}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, app_version: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                <Send size={16} /> Retain into Hindsight Memory Bank
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY PM DIGEST */}
      {activeTab === 'digest' && (
        <div className="digest-container">
          <div className="digest-banner">
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-bold)' }}>
                Executive Product Intelligence Digest
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>
                Synthesized across standing mental models with strict evidentiary grounding.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (digest) {
                    const text = `# ${digest.title}\n\nGenerated: ${digest.date_formatted}\nTotal Citations: ${digest.total_sources_cited}\n\n` +
                      (digest.themes || []).map((t, i) => `## ${i + 1}. ${t.name} (${t.evidence_count} sources)\n\n${t.observation}`).join('\n\n');
                    copyToClipboard(text, 'digest');
                  }
                }}
              >
                {copiedDigest ? <Check size={14} color="var(--success-text)" /> : <Copy size={14} />}
                <span>{copiedDigest ? 'Copied Markdown!' : 'Copy Markdown'}</span>
              </button>

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
              <div className="digest-meta">
                <span>📅 Generated: <strong>{digest.date_formatted}</strong></span>
                <span>•</span>
                <span>🛡️ Total Citations Grounded: <strong>{digest.total_sources_cited}</strong></span>
                <span>•</span>
                <span>🧠 Standing Themes: <strong>{digest.themes?.length || 0}</strong></span>
              </div>

              {digest.themes?.map((t, idx) => (
                <div key={idx} className="digest-theme-item">
                  <div className="digest-theme-header">
                    <h4 className="digest-theme-title">
                      {idx + 1}. {t.name}
                    </h4>
                    <span className="digest-badge">
                      {t.evidence_count} Evidence Citations
                    </span>
                  </div>
                  <div className="digest-theme-observation">
                    {t.observation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="digest-card" style={{ textAlign: 'center', padding: '50px 24px', color: 'var(--text-muted)' }}>
              <FileText size={44} style={{ opacity: 0.4, marginBottom: '14px' }} />
              <h3 style={{ color: 'var(--text-bold)', fontSize: '18px', margin: '0 0 8px 0' }}>No Executive Digest Generated Yet</h3>
              <p style={{ fontSize: '13.5px', maxWidth: '520px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                No feedback has been synthesized yet. Ingest your customer feedback files in the <strong>Ingestion Pipeline</strong> tab, then click <strong>⚡ Run Synthesis</strong> to generate your evidence-grounded digest.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveTab('ingest')}
              >
                <Upload size={16} /> Go to Ingestion Pipeline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
