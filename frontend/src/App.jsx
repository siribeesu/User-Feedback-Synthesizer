import React, { useState, useEffect } from 'react';
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
  Upload
} from 'lucide-react';
import './App.css';

const API_BASE = ''; // Relative path works for both proxy and FastAPI hosted static

export default function App() {
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
  const [feedbackInput, setFeedbackInput] = useState({
    title: '',
    content: '',
    source: 'App Store',
    rating: 1,
    app_version: 'v2.3'
  });
  const [notification, setNotification] = useState('');

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
        <div style={{
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid #3b82f6',
          color: '#93c5fd',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
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
            <h3 style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 4px 0' }}>Standing Themes</h3>
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
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#94a3b8' }}>
                    Confidence & Grounding:{' '}
                    <span style={{ color: '#4ade80', fontWeight: '600' }}>
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
                  <p style={{ color: '#94a3b8' }}>No quotes cited.</p>
                )}
              </div>
            ) : (
              <p style={{ color: '#94a3b8' }}>Select a theme from the left to view details.</p>
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
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h3 className="section-heading">Quick Ingest Feedback</h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
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
      )}

      {/* TAB 4: WEEKLY PM DIGEST */}
      {activeTab === 'digest' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>Executive Product Feedback Digest</h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
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
            <div style={{ background: '#151c2e', border: '1px solid #222f47', borderRadius: '10px', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>{digest.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
                Generated: {digest.date_formatted} | Citations Grounded: <strong>{digest.total_sources_cited}</strong>
              </p>

              {digest.themes?.map((t, idx) => (
                <div key={idx} style={{ borderTop: '1px solid #222f47', paddingTop: '18px', marginTop: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '16px', color: '#3b82f6', margin: 0 }}>
                      {idx + 1}. {t.name}
                    </h4>
                    <span style={{ fontSize: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '10px' }}>
                      {t.evidence_count} Sources
                    </span>
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {t.observation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>Loading digest...</p>
          )}
        </div>
      )}
    </div>
  );
}
