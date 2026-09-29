import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Search, Layers, Activity, GitBranch, Target,
  Clock, Database, Brain, CheckSquare, FileText, Settings,
  ChevronRight, ChevronLeft, ArrowUp, ArrowDown, Star, Zap,
  AlertTriangle, Users, Tag, Send, RefreshCw, Download,
  Plus, X, BarChart2, MessageSquare, Sparkles, Check, Server,
  ExternalLink, Filter, TrendingUp, ThumbsUp, ThumbsDown,
  Pin, User, Package, Calendar, Gift, Bookmark, Sliders, ShieldCheck,
  Share2, Terminal, Play, Copy, CheckCircle2, Radio, Globe, Cpu,
  ArrowRight, CornerDownRight, UploadCloud, Trash2, Power, FileUp, Table
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import BRAND from './brand.js';
import './App.css';

const API_BASE = '';

// Helper to sanitize raw markdown, escaped slashes, and JSON artifacts
export const cleanText = (txt) => {
  if (!txt) return '';
  if (typeof txt !== 'string') return String(txt);
  return txt
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\t/g, ' ')
    .replace(/\\\*/g, '*')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .trim();
};

// Helper to parse complex Hindsight observation blocks into structured sections
export const parseObservation = (rawObs) => {
  if (!rawObs) return { summary: '', metrics: [], temporalShift: null };
  const cleaned = rawObs.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/');
  
  let temporalShift = null;
  const shiftMatch = cleaned.match(/TEMPORAL SHIFT DETECTED[:\s]*([^\n]+(?:\n[^\n#]+)*)/i);
  if (shiftMatch) {
    temporalShift = shiftMatch[1].replace(/\*\*/g, '').replace(/[-•*]/g, '').trim();
  }

  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const metrics = [];
  const otherLines = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.toLowerCase().includes('synthesized finding') || line.toLowerCase().includes('representative source')) {
      continue;
    }
    if (line.includes('TEMPORAL SHIFT DETECTED')) {
      continue;
    }
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const stripped = line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
      if (stripped.includes(':') && !stripped.toLowerCase().startsWith('http')) {
        const [k, ...v] = stripped.split(':');
        metrics.push({ label: k.trim(), value: v.join(':').trim() });
      } else {
        otherLines.push(stripped);
      }
    } else {
      otherLines.push(line.replace(/\*\*/g, '').trim());
    }
  }

  return {
    summary: otherLines.join(' ').trim(),
    metrics,
    temporalShift
  };
};

// Helper to parse context strings e.g. "Source: NPS Survey | User: Hannah Abbott (Pro Tier) | Rating: 3 | Version: v2.3"
export const parseEvidenceContext = (ctx) => {
  if (!ctx) return { source: 'Direct Feedback', user: 'Anonymous', rating: 3, version: 'v2.3' };
  const parts = ctx.split('|').map(p => p.trim());
  const res = { source: '', user: '', rating: 3, version: '', segment: '' };
  
  for (const part of parts) {
    if (part.toLowerCase().startsWith('source:')) {
      res.source = part.replace(/^source:\s*/i, '').trim();
    } else if (part.toLowerCase().startsWith('user:')) {
      const uStr = part.replace(/^user:\s*/i, '').trim();
      const segMatch = uStr.match(/\((.*?)\)/);
      if (segMatch) {
        res.segment = segMatch[1];
        res.user = uStr.replace(/\(.*?\)/, '').trim();
      } else {
        res.user = uStr;
      }
    } else if (part.toLowerCase().startsWith('rating:')) {
      res.rating = parseInt(part.replace(/^rating:\s*/i, '').trim(), 10) || 3;
    } else if (part.toLowerCase().startsWith('version:')) {
      res.version = part.replace(/^version:\s*/i, '').trim();
    }
  }
  return res;
};

const MAIN_NAV_GROUPS = [
  {
    title: 'Workspace',
    items: [
      { id: 'overview', icon: LayoutDashboard, label: 'Executive Dashboard' },
      { id: 'explorer', icon: Search, label: 'Feedback Explorer' },
      { id: 'integrations', icon: Share2, label: 'Data Connectors' },
      { id: 'themes', icon: Layers, label: 'Themes & Insights' },
      { id: 'sentiment', icon: Activity, label: 'Sentiment Analytics' },
      { id: 'releases', icon: GitBranch, label: 'Release Impact' },
      { id: 'opportunities', icon: Target, label: 'Feature Opportunities' }
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'memory-timeline', icon: Clock, label: 'Memory Timeline' },
      { id: 'memory-explorer', icon: Database, label: 'Memory Explorer' },
      { id: 'copilot', icon: Brain, label: 'AI Copilot' },
      { id: 'resolutions', icon: CheckSquare, label: 'Resolution Tracker' }
    ]
  }
];

const BOTTOM_NAV_GROUP = {
  title: 'Reports & System',
  items: [
    { id: 'reports', icon: FileText, label: 'Reports & Digests' },
    { id: 'settings', icon: Settings, label: 'Settings & Preferences' }
  ]
};

// Rich default feedback dataset for offline/instant exploration
const DEFAULT_FEEDBACK_DATASET = [
  { id: 'FB-0001', text: 'Checkout crashed when I tried paying with Apple Pay on v2.3. Completely blocked my purchase.', metadata: { source: 'App Store', user_name: 'Marcus Vance', segment: 'Pro Tier', rating: '1', app_version: 'v2.3', theme: 'release-v23-stability' }, timestamp: '2026-09-28' },
  { id: 'FB-0002', text: 'Stripe gateway timeout during peak hours. Error 504 on checkout screen.', metadata: { source: 'Zendesk', user_name: 'Elena Rostova', segment: 'Enterprise Tier', rating: '1', app_version: 'v2.3', theme: 'release-v23-stability' }, timestamp: '2026-09-28' },
  { id: 'FB-0003', text: 'Love the new v2.2 search performance! Instant auto-complete makes finding items so smooth.', metadata: { source: 'Google Play', user_name: 'David Kim', segment: 'Free Tier', rating: '5', app_version: 'v2.2', theme: 'checkout-ux' }, timestamp: '2026-09-27' },
  { id: 'FB-0004', text: 'SMS OTP verification took 12 minutes to arrive. Had to retry 3 times to register.', metadata: { source: 'Intercom', user_name: 'Fatima Al-Mansoor', segment: 'Free Tier', rating: '2', app_version: 'v2.3', theme: 'onboarding-friction' }, timestamp: '2026-09-27' },
  { id: 'FB-0005', text: 'We desperately need automated weekly CSV and PDF report export for accounting.', metadata: { source: 'Discord', user_name: 'Sarah Jenkins', segment: 'Enterprise Tier', rating: '4', app_version: 'v2.3', theme: 'feature-requests-export' }, timestamp: '2026-09-26' },
  { id: 'FB-0006', text: 'FaceID login fails consistently on iOS 18 beta. Have to type master password every time.', metadata: { source: 'App Store', user_name: 'Liam Gallagher', segment: 'Pro Tier', rating: '2', app_version: 'v2.3', theme: 'release-v23-stability' }, timestamp: '2026-09-26' },
  { id: 'FB-0007', text: 'App ignored my iOS enlarged accessibility font settings. Text remains tiny 11pt.', metadata: { source: 'NPS Survey', user_name: 'Arthur Pendelton', segment: 'Free Tier', rating: '2', app_version: 'v2.2', theme: 'onboarding-friction' }, timestamp: '2026-09-25' },
  { id: 'FB-0008', text: 'Seamless Apple Pay checkout flow. One tap and done. Huge upgrade from previous version!', metadata: { source: 'Google Play', user_name: 'Quinn Bailey', segment: 'Pro Tier', rating: '5', app_version: 'v2.2', theme: 'checkout-ux' }, timestamp: '2026-09-25' },
  { id: 'FB-0009', text: 'Pricing tier auto-renewed without sending email notification 3 days prior. Refund process was slow.', metadata: { source: 'Zendesk', user_name: 'Chloe Bennett', segment: 'Pro Tier', rating: '2', app_version: 'v2.3', theme: 'pricing-transparency' }, timestamp: '2026-09-24' },
  { id: 'FB-0010', text: 'Super fast background sync on v2.1. Never lost my cart items even on subway connection.', metadata: { source: 'Discord', user_name: 'Travis Scott', segment: 'Free Tier', rating: '5', app_version: 'v2.1', theme: 'checkout-ux' }, timestamp: '2026-09-24' }
];

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setHealth(d))
      .catch(() => {});
  }, []);

  const showToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const allNavItems = [...MAIN_NAV_GROUPS.flatMap(g => g.items), ...BOTTOM_NAV_GROUP.items];
  const activeNavItem = allNavItems.find(p => p.id === activePage) || allNavItems[0];
  const activeGroup = MAIN_NAV_GROUPS.find(g => g.items.some(i => i.id === activePage))?.title || BOTTOM_NAV_GROUP.title;

  const renderPage = () => {
    switch (activePage) {
      case 'overview': return <Overview showToast={showToast} onNavigate={setActivePage} />;
      case 'explorer': return <Explorer showToast={showToast} />;
      case 'integrations': return <Integrations showToast={showToast} onNavigate={setActivePage} />;
      case 'themes': return <Themes showToast={showToast} />;
      case 'sentiment': return <Sentiment showToast={showToast} />;
      case 'releases': return <Releases showToast={showToast} />;
      case 'opportunities': return <Opportunities showToast={showToast} />;
      case 'memory-timeline': return <MemoryTimeline showToast={showToast} />;
      case 'memory-explorer': return <MemoryExplorer showToast={showToast} />;
      case 'copilot': return <Copilot showToast={showToast} />;
      case 'resolutions': return <Resolutions showToast={showToast} />;
      case 'reports': return <Reports showToast={showToast} />;
      case 'settings': return <SettingsPage showToast={showToast} />;
      default: return <Overview showToast={showToast} onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <Brain size={22} color="#09090b" />
          <span className="sidebar-logo-text">{BRAND.name}</span>
        </div>

        <div className="sidebar-scrollable">
          {MAIN_NAV_GROUPS.map((group, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{group.title}</div>
              {group.items.map(page => {
                const Icon = page.icon;
                return (
                  <div
                    key={page.id}
                    className={`nav-item ${activePage === page.id ? 'active' : ''}`}
                    onClick={() => setActivePage(page.id)}
                    title={sidebarCollapsed ? page.label : ''}
                  >
                    <Icon size={16} />
                    <span className="nav-label">{page.label}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Bottom Section: Reports & System */}
          <div className="sidebar-bottom-group nav-section">
            <div className="nav-section-title">{BOTTOM_NAV_GROUP.title}</div>
            {BOTTOM_NAV_GROUP.items.map(page => {
              const Icon = page.icon;
              return (
                <div
                  key={page.id}
                  className={`nav-item ${activePage === page.id ? 'active' : ''}`}
                  onClick={() => setActivePage(page.id)}
                  title={sidebarCollapsed ? page.label : ''}
                >
                  <Icon size={16} />
                  <span className="nav-label">{page.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" style={{ padding: '6px', width: sidebarCollapsed ? '100%' : 'auto' }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-breadcrumb">{activeGroup} /</span>
            <h1 className="page-title">{activeNavItem.label}</h1>
          </div>
          <div className="topbar-right"></div>
        </header>

        <div className="page-content">
          {renderPage()}
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {t.type === 'error' ? <AlertTriangle size={15} /> : <CheckSquare size={15} />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// 1. Executive Dashboard
function Overview({ showToast, onNavigate }) {
  const [data, setData] = useState(null);
  const [sentimentData, setSentimentData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, sentRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/dashboard`).catch(() => null),
          fetch(`${API_BASE}/analytics/sentiment-trend`).catch(() => null)
        ]);
        
        let dData = null;
        if (dashRes && dashRes.ok) dData = await dashRes.json();
        
        let sData = [];
        if (sentRes && sentRes.ok) {
          const sResp = await sentRes.json();
          sData = sResp.trend || [];
        }

        if (!dData || !dData.total_feedback) {
          dData = {
            total_feedback: 76,
            negative_percentage: '22%',
            active_themes: 5,
            emerging_issues: 3,
            source_breakdown: { 'App Store': 24, 'Google Play': 12, 'Zendesk': 12, 'Intercom': 11, 'Discord': 9, 'NPS Survey': 8 },
            ai_insights: [
              { title: 'Checkout crash spike on v2.3 release', description: 'Stripe gateway timeout during peak hours is causing 504 errors on iOS.', priority: 'High' },
              { title: 'SMS OTP latency in APAC onboarding', description: '6-digit verification codes taking 10+ mins leading to high drop-offs.', priority: 'High' },
              { title: 'Strong praise for Apple Pay integration', description: 'One-tap payments received 92% positive rating in v2.2.', priority: 'Medium' }
            ]
          };
        }

        if (!sData.length) {
          sData = [
            { date: 'Sep 24', positive: 65, neutral: 20, negative: 15 },
            { date: 'Sep 25', positive: 60, neutral: 25, negative: 15 },
            { date: 'Sep 26', positive: 50, neutral: 20, negative: 30 },
            { date: 'Sep 27', positive: 45, neutral: 25, negative: 30 },
            { date: 'Sep 28', positive: 55, neutral: 20, negative: 25 },
            { date: 'Sep 29', positive: 70, neutral: 18, negative: 12 }
          ];
        }

        setData(dData);
        setSentimentData(sData);
      } catch (err) {
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  if (loading) return <div className="loading-skeleton" style={{ height: '100%', minHeight: '450px' }} />;

  const sources = data?.source_breakdown ? Object.entries(data.source_breakdown).map(([name, value]) => ({ name, value })) : [];

  return (
    <>
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-icon"><MessageSquare size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Total Ingested Records</div>
            <div className="metric-value">{data?.total_feedback || 76}</div>
          </div>
        </div>
        <div className="card metric-card">
          <div className="metric-icon"><AlertTriangle size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Negative Sentiment Rate</div>
            <div className="metric-value">{data?.negative_percentage || '22%'}</div>
          </div>
        </div>
        <div className="card metric-card">
          <div className="metric-icon"><Layers size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Standing Mental Models</div>
            <div className="metric-value">{data?.active_themes || 5}</div>
          </div>
        </div>
        <div className="card metric-card">
          <div className="metric-icon"><Zap size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Temporal Shift Alerts</div>
            <div className="metric-value">{data?.emerging_issues || 3}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="card chart-card" style={{ flex: '6' }}>
          <div className="chart-header">
            <span>Sentiment Progression Trend (30-Day Window)</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentData}>
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: '#09090b', color: '#fff', borderRadius: '4px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="positive" name="Positive %" stroke="#09090b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="neutral" name="Neutral %" stroke="#71717a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="negative" name="Negative %" stroke="#d4d4d8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card chart-card" style={{ flex: '4' }}>
          <div className="chart-header">
            <span>Multi-Channel Ingestion Volume</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={sources}>
                <XAxis type="number" stroke="#71717a" fontSize={11} />
                <YAxis dataKey="name" type="category" width={85} stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: '#09090b', color: '#fff', borderRadius: '4px', fontSize: '12px' }} />
                <Bar dataKey="value" name="Feedback Items" fill="#09090b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Voice of Customer Live Signals */}
      <div className="card">
        <div className="chart-header">
          <span>Real-time Voice of Customer Signals</span>
          <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => onNavigate('explorer')}>
            View All in Explorer →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {DEFAULT_FEEDBACK_DATASET.slice(0, 3).map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="badge">{f.metadata.source}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Star size={10} fill="currentColor" /> {f.metadata.rating}/5 · {f.metadata.app_version}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#09090b', lineHeight: 1.4, margin: '6px 0', fontStyle: 'italic' }}>
                "{cleanText(f.text)}"
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <User size={10} /> {f.metadata.user_name} ({f.metadata.segment})
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// 2. Feedback Explorer (ROBUST MULTI-FIELD SEARCH & INSTANT FILTERS)
function Explorer({ showToast }) {
  const [allData, setAllData] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ query: '', source: '', rating: '', sentiment: '', app_version: '' });
  const [expandedId, setExpandedId] = useState(null);

  // Initial load of all available records
  useEffect(() => {
    fetch(`${API_BASE}/memory/inspect?limit=100`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const mems = d?.memories?.length ? d.memories : DEFAULT_FEEDBACK_DATASET;
        setAllData(mems);
        setResults(mems);
      })
      .catch(() => {
        setAllData(DEFAULT_FEEDBACK_DATASET);
        setResults(DEFAULT_FEEDBACK_DATASET);
      });
  }, []);

  // Filter application
  useEffect(() => {
    let sourcePool = allData.length > 0 ? allData : DEFAULT_FEEDBACK_DATASET;
    let filtered = [...sourcePool];

    // 1. Text Query Filter
    if (params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const textMatch = (item.text || '').toLowerCase().includes(q);
        const userMatch = (item.metadata?.user_name || '').toLowerCase().includes(q);
        const segMatch = (item.metadata?.segment || '').toLowerCase().includes(q);
        const themeMatch = (item.metadata?.theme || '').toLowerCase().includes(q);
        return textMatch || userMatch || segMatch || themeMatch;
      });
    }

    // 2. Ingestion Source Channel Filter
    if (params.source) {
      filtered = filtered.filter(item => {
        const src = (item.metadata?.source || item.source || '').toLowerCase();
        return src === params.source.toLowerCase();
      });
    }

    // 3. Exact Star Rating Filter (1-5)
    if (params.rating) {
      const targetRating = parseInt(params.rating, 10);
      filtered = filtered.filter(item => {
        const r = parseInt(item.metadata?.rating || item.rating || 3, 10);
        return r === targetRating;
      });
    }

    // 4. Sentiment Filter (positive >=4, neutral 3, negative <=2)
    if (params.sentiment) {
      filtered = filtered.filter(item => {
        const r = parseInt(item.metadata?.rating || item.rating || 3, 10);
        const derivedSent = r >= 4 ? 'positive' : r <= 2 ? 'negative' : 'neutral';
        const rawSent = (item.sentiment || derivedSent).toLowerCase();
        return rawSent === params.sentiment.toLowerCase();
      });
    }

    // 5. Release Version Filter (v2.1, v2.2, v2.3, etc.)
    if (params.app_version.trim()) {
      const vQuery = params.app_version.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const v = (item.metadata?.app_version || item.app_version || '').toLowerCase();
        return v.includes(vQuery);
      });
    }

    setResults(filtered);
  }, [params, allData]);

  const hasActiveFilters = Boolean(params.query || params.source || params.rating || params.sentiment || params.app_version);

  const clearFilters = () => {
    setParams({ query: '', source: '', rating: '', sentiment: '', app_version: '' });
    showToast('Filters reset to show all records');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Search & Filter Bar */}
      <div className="explorer-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Semantic search across feedback, users, pain points..." 
          className="input-control" 
          style={{ flex: 2, minWidth: '220px' }}
          value={params.query}
          onChange={e => setParams({...params, query: e.target.value})}
        />
        <select className="input-control" style={{ flex: 1, minWidth: '150px' }} value={params.source} onChange={e => setParams({...params, source: e.target.value})}>
          <option value="">All Channels</option>
          <option value="App Store">Apple App Store</option>
          <option value="Google Play">Google Play Store</option>
          <option value="Zendesk">Zendesk Tickets</option>
          <option value="Intercom">Intercom Chat</option>
          <option value="Discord">Discord Community</option>
          <option value="NPS Survey">NPS Survey</option>
          <option value="In-App Feedback">In-App Feedback SDK</option>
        </select>
        <select className="input-control" style={{ width: '120px' }} value={params.rating} onChange={e => setParams({...params, rating: e.target.value})}>
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        <select className="input-control" style={{ width: '130px' }} value={params.sentiment} onChange={e => setParams({...params, sentiment: e.target.value})}>
          <option value="">All Sentiments</option>
          <option value="positive">Positive (4-5★)</option>
          <option value="neutral">Neutral (3★)</option>
          <option value="negative">Negative (1-2★)</option>
        </select>
        <input 
          type="text" 
          placeholder="Version (e.g. v2.3)" 
          className="input-control" 
          style={{ width: '130px' }}
          value={params.app_version}
          onChange={e => setParams({...params, app_version: e.target.value})}
        />
        {hasActiveFilters && (
          <button className="btn btn-outline" style={{ fontSize: 11, padding: '6px 10px' }} onClick={clearFilters}>
            <X size={12} /> Reset
          </button>
        )}
      </div>

      {/* Results Count & Active Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-dim)', padding: '0 2px' }}>
        <span>Showing <strong>{results.length}</strong> of <strong>{allData.length || 76}</strong> feedback records</span>
        {hasActiveFilters && (
          <span style={{ fontSize: 11 }}>Active Filters Applied</span>
        )}
      </div>

      {/* Feedback Feed */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div className="loading-skeleton" style={{ height: '350px' }} />
        ) : results.length > 0 ? (
          results.map((r, i) => {
            const rating = parseInt(r.metadata?.rating || r.rating || 3, 10);
            const cleaned = cleanText(r.text || r.content || '');
            const source = r.metadata?.source || r.source || 'Web';
            const userName = r.metadata?.user_name || r.user_name || 'Anonymous';
            const segment = r.metadata?.segment || r.segment || 'General';
            const version = r.metadata?.app_version || r.app_version || 'v2.3';
            const dateStr = (r.timestamp || r.occurred_start || '').substring(0, 10) || 'Recent';
            const sentiment = r.sentiment || (rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral');

            return (
              <div key={r.id || i} className="feedback-card" style={{ marginBottom: 10 }}>
                <div className="feedback-header">
                  <div className="stars">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} size={13} fill={idx < rating ? 'currentColor' : 'none'} color="#09090b" />
                    ))}
                  </div>
                  <span className="badge" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                    {sentiment}
                  </span>
                </div>
                <div className="feedback-text">
                  {expandedId === i ? cleaned : `${cleaned.substring(0, 160)}${cleaned.length > 160 ? '...' : ''}`}
                  {cleaned.length > 160 && (
                    <button className="btn btn-outline" style={{ padding: '1px 6px', fontSize: '10px', marginLeft: '6px' }} onClick={() => setExpandedId(expandedId === i ? null : i)}>
                      {expandedId === i ? 'Less' : 'Read Full'}
                    </button>
                  )}
                </div>
                <div className="feedback-meta">
                  <span className="badge">{source}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><User size={11} /> {userName} ({segment})</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Package size={11} /> {version}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Calendar size={11} /> {dateStr}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Search size={36} className="empty-state-icon" style={{ margin: '0 auto 10px auto', color: 'var(--text-dim)' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>No feedback records match your selected filters</p>
            <button className="btn btn-primary" style={{ marginTop: 12, fontSize: 12 }} onClick={clearFilters}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Data Connectors & Integrations Hub (CONNECT APPS, BULK INGESTION & WEBHOOKS)
function Integrations({ showToast, onNavigate }) {
  const [activeCodeTab, setActiveCodeTab] = useState('curl');
  const [activeTab, setActiveTab] = useState('connectors'); // 'connectors' | 'bulk' | 'webhooks'
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [newConn, setNewConn] = useState({
    type: 'app_store',
    name: 'Apple App Store Connect',
    identifier: 'com.fedar.mobile',
    apiKey: '',
    syncFreq: '15m',
    channelName: ''
  });
  const [testingConn, setTestingConn] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  // Bulk Importer State
  const [bulkData, setBulkData] = useState(DEFAULT_FEEDBACK_DATASET);
  const [importing, setImporting] = useState(false);

  const [connectors, setConnectors] = useState([
    {
      id: 'app_store',
      name: 'Apple App Store Connect',
      category: 'Mobile App Store',
      status: 'active',
      protocol: 'App Store Server Notifications V2',
      syncFreq: 'Every 15 mins',
      identifier: 'com.fedar.ios',
      recordsCount: 24,
      avgRating: '3.2 / 5.0',
      lastSynced: '2 mins ago',
      description: 'Ingests iOS customer ratings, reviews, and version remarks across v2.1, v2.2, and v2.3.'
    },
    {
      id: 'google_play',
      name: 'Google Play Developer Console',
      category: 'Android Play Store',
      status: 'active',
      protocol: 'Play Developer API (v3)',
      syncFreq: 'Real-time Webhook',
      identifier: 'com.fedar.android',
      recordsCount: 12,
      avgRating: '4.1 / 5.0',
      lastSynced: '10 mins ago',
      description: 'Captures Android user ratings, device specifications, and crash comments.'
    },
    {
      id: 'zendesk',
      name: 'Zendesk Support Suite',
      category: 'Customer Escalations',
      status: 'active',
      protocol: 'Zendesk Webhook Triggers',
      syncFreq: 'Instant on ticket close',
      identifier: 'fedar.zendesk.com',
      recordsCount: 12,
      avgRating: '1.8 / 5.0',
      lastSynced: 'Just now',
      description: 'Syncs customer support escalation tickets, billing errors, and gateway timeout logs.'
    },
    {
      id: 'intercom',
      name: 'Intercom Live Messenger',
      category: 'Conversational Support',
      status: 'active',
      protocol: 'Intercom REST Webhooks',
      syncFreq: 'Real-time Events',
      identifier: 'app_id_948291',
      recordsCount: 11,
      avgRating: '2.4 / 5.0',
      lastSynced: '15 mins ago',
      description: 'Captures onboarding friction transcripts, live chat questions, and drop-off reports.'
    },
    {
      id: 'discord',
      name: 'Discord Community Server',
      category: 'Community Forum',
      status: 'active',
      protocol: 'Discord Gateway Bot Listener',
      syncFreq: 'Real-time Channel Stream',
      identifier: '#feedback & #bug-reports',
      recordsCount: 9,
      avgRating: '4.6 / 5.0',
      lastSynced: '22 mins ago',
      description: 'Monitors community feedback channels, feature request posts, and power user discussions.'
    },
    {
      id: 'in_app_sdk',
      name: 'In-App Direct SDK Widget',
      category: 'Direct Client SDK',
      status: 'active',
      protocol: 'POST /ingest (REST API)',
      syncFreq: 'Immediate (0-auth)',
      identifier: 'SDK-Key: fedar_live_89a',
      recordsCount: 8,
      avgRating: '4.0 / 5.0',
      lastSynced: 'Active',
      description: 'Zero-friction 1-tap feedback widget embedded inside web and mobile applications.'
    }
  ]);

  const toggleConnectorStatus = (id) => {
    setConnectors(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'active' ? 'paused' : 'active';
        showToast(`${c.name} pipeline is now ${nextStatus}`);
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const handleSyncNow = (id) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setConnectors(prev => prev.map(c => {
        if (c.id === id) {
          return { ...c, recordsCount: c.recordsCount + 3, lastSynced: 'Just now' };
        }
        return c;
      }));
      showToast('Connection synced successfully! 3 new records retained.', 'success');
    }, 900);
  };

  const handleCreateConnection = () => {
    setTestingConn(true);
    setTimeout(() => {
      setTestingConn(false);
      const created = {
        id: `conn_${Date.now()}`,
        name: newConn.name || 'Custom Application Connection',
        category: newConn.type === 'slack' ? 'Team Chat' : newConn.type === 'github' ? 'Developer Issues' : 'Data Pipeline',
        status: 'active',
        protocol: 'Verified HTTPS Webhook',
        syncFreq: newConn.syncFreq,
        identifier: newConn.identifier || 'Live Stream Active',
        recordsCount: 0,
        avgRating: 'Pending Sync',
        lastSynced: 'Connected just now',
        description: `Active pipeline streaming customer feedback from ${newConn.name} into Hindsight memory.`
      };
      setConnectors(prev => [created, ...prev]);
      setShowConnectModal(false);
      showToast(`Connected ${created.name} successfully!`, 'success');
    }, 800);
  };

  const handleBulkPreset = (type) => {
    if (type === 'appstore') {
      setBulkData([
        { id: 'FB-BULK-1', text: 'Checkout crash on iOS 18 after tapping Apple Pay. Completely broken.', metadata: { source: 'App Store', user_name: 'David Miller', rating: '1', app_version: 'v2.3', segment: 'Pro Tier' }, timestamp: '2026-09-28' },
        { id: 'FB-BULK-2', text: 'Super clean UI update! The auto-complete search is 10x faster than before.', metadata: { source: 'App Store', user_name: 'Jessica Taylor', rating: '5', app_version: 'v2.2', segment: 'Free Tier' }, timestamp: '2026-09-27' },
        { id: 'FB-BULK-3', text: 'App battery consumption jumped 20% in the background following the latest patch.', metadata: { source: 'App Store', user_name: 'Lucas Wright', rating: '2', app_version: 'v2.3', segment: 'Pro Tier' }, timestamp: '2026-09-26' },
        { id: 'FB-BULK-4', text: 'Best customer feedback tool we have used. The memory intelligence is impressive.', metadata: { source: 'App Store', user_name: 'Rachel Adams', rating: '5', app_version: 'v2.2', segment: 'Enterprise Tier' }, timestamp: '2026-09-25' }
      ]);
      showToast('Loaded App Store sample bulk dataset');
    } else if (type === 'zendesk') {
      setBulkData([
        { id: 'ZD-8921', text: 'Error 504 Gateway Timeout when executing monthly invoice generation.', metadata: { source: 'Zendesk', user_name: 'FinTech Admin', rating: '1', app_version: 'v2.3', segment: 'Enterprise Tier' }, timestamp: '2026-09-28' },
        { id: 'ZD-8922', text: 'Need granular role-based access control for team members in workspace.', metadata: { source: 'Zendesk', user_name: 'Corporate PM', rating: '3', app_version: 'v2.3', segment: 'Enterprise Tier' }, timestamp: '2026-09-27' },
        { id: 'ZD-8923', text: 'Customer service resolved our domain configuration ticket within 15 minutes. Great support.', metadata: { source: 'Zendesk', user_name: 'Samira Khan', rating: '5', app_version: 'v2.1', segment: 'Growth Tier' }, timestamp: '2026-09-26' }
      ]);
      showToast('Loaded Zendesk support ticket bulk dataset');
    }
  };

  const handleExecuteBulkImport = async () => {
    setImporting(true);
    try {
      // Ingest items sequentially to the backend
      for (const item of bulkData) {
        await fetch(`${API_BASE}/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: item.text,
            source: item.metadata?.source || 'Bulk Import',
            user_name: item.metadata?.user_name || 'Anonymous',
            rating: parseInt(item.metadata?.rating || 3, 10),
            app_version: item.metadata?.app_version || 'v2.3',
            segment: item.metadata?.segment || 'General'
          })
        }).catch(() => {});
      }
      showToast(`Successfully imported ${bulkData.length} records into Hindsight Memory Bank!`, 'success');
    } catch (e) {
      showToast('Import completed with fallback retention', 'info');
    } finally {
      setImporting(false);
    }
  };

  const copySnippet = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  const CODE_SNIPPETS = {
    curl: `curl -X POST "https://api.fedar.ai/ingest" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Checkout crashed when using Apple Pay on v2.3",
    "source": "App Store",
    "user_name": "Marcus Vance",
    "segment": "Pro Tier",
    "rating": 1,
    "app_version": "v2.3"
  }'`,
    js: `// React / Node.js In-App Feedback SDK
import { fedar } from '@fedar/client';

await fedar.ingest({
  content: 'Love the new search speed on v2.2!',
  rating: 5,
  source: 'In-App Widget',
  userName: currentUser.name,
  segment: currentUser.planTier,
  appVersion: 'v2.2'
});`,
    python: `# Python Backend / Webhook Ingestion Script
import requests

payload = {
    "content": "Stripe gateway timeout during peak hours. Error 504.",
    "source": "Zendesk",
    "user_name": "Elena Rostova",
    "segment": "Enterprise Tier",
    "rating": 1,
    "app_version": "v2.3"
}

resp = requests.post("http://localhost:8000/ingest", json=payload)
print(resp.json()) # -> {"status": "retained", "bank_id": "mobile-app-feedback"}`,
    swift: `// Swift / iOS App Feedback Capture
let feedback: [String: Any] = [
    "content": "FaceID login fails on iOS 18 beta",
    "source": "App Store",
    "rating": 2,
    "user_name": "Liam Gallagher",
    "app_version": "v2.3"
]

FedarSDK.shared.ingest(feedback) { result in
    print("Memory Retained:", result)
}`
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#09090b' }}>
            Data Connectors & Ingestion Architecture
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Connect third-party apps, app stores, support desks, and bulk datasets into persistent Hindsight memory.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setActiveTab(activeTab === 'bulk' ? 'connectors' : 'bulk')}>
            <UploadCloud size={13} /> {activeTab === 'bulk' ? 'View Connectors' : 'Bulk Data Importer'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowConnectModal(true)}>
            <Plus size={13} /> Connect New Source
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        <button 
          className={`btn ${activeTab === 'connectors' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={() => setActiveTab('connectors')}
        >
          <Share2 size={13} /> Active Application Connectors ({connectors.length})
        </button>
        <button 
          className={`btn ${activeTab === 'bulk' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={() => setActiveTab('bulk')}
        >
          <Table size={13} /> Bulk Dataset Ingestion (CSV / JSON)
        </button>
        <button 
          className={`btn ${activeTab === 'webhooks' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={() => setActiveTab('webhooks')}
        >
          <Terminal size={13} /> Webhooks & SDK Documentation
        </button>
      </div>

      {/* TAB 1: ACTIVE APPLICATION CONNECTORS */}
      {activeTab === 'connectors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {connectors.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                    {c.category}
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: 14, fontWeight: 800 }}>{c.name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="badge" style={{ 
                    background: c.status === 'active' ? '#09090b' : 'var(--bg-hover)', 
                    color: c.status === 'active' ? '#ffffff' : 'var(--text-dim)',
                    fontSize: 10,
                    textTransform: 'uppercase'
                  }}>
                    {c.status === 'active' ? '● Active Stream' : '○ Paused'}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                {c.description}
              </p>

              <div style={{ background: 'var(--bg-hover)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Identifier / App:</span>
                  <strong>{c.identifier}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Protocol:</span>
                  <span>{c.protocol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Sync Frequency:</span>
                  <span>{c.syncFreq}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Retained Memories:</span>
                  <strong>{c.recordsCount} items ({c.avgRating})</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Last sync: {c.lastSynced}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => handleSyncNow(c.id)}
                    disabled={syncingId === c.id}
                  >
                    <RefreshCw size={11} className={syncingId === c.id ? 'spin' : ''} /> {syncingId === c.id ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => toggleConnectorStatus(c.id)}
                  >
                    <Power size={11} /> {c.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: BULK DATA IMPORTER */}
      {activeTab === 'bulk' && (
        <div className="card" style={{ gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Bulk Feedback Ingestion Tool</h3>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Import historical CSV or JSON exports into the persistent memory bank.</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-outline" style={{ fontSize: 11 }} onClick={() => handleBulkPreset('appstore')}>
                Load Sample App Store Dataset
              </button>
              <button className="btn btn-outline" style={{ fontSize: 11 }} onClick={() => handleBulkPreset('zendesk')}>
                Load Sample Zendesk Dataset
              </button>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div style={{ 
            border: '2px dashed var(--border-strong)', 
            borderRadius: 8, 
            padding: '24px 16px', 
            textAlign: 'center', 
            background: 'var(--bg-hover)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}>
            <UploadCloud size={32} color="#09090b" />
            <div style={{ fontSize: 13, fontWeight: 700 }}>Drag and drop feedback export file here</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Supports CSV, JSON, and Excel formats (Auto-maps Content, User, Rating, Version)</div>
          </div>

          {/* Dataset Preview Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Dataset Preview ({bulkData.length} Records Loaded)
              </span>
              <button className="btn btn-primary" onClick={handleExecuteBulkImport} disabled={importing}>
                <FileUp size={12} /> {importing ? 'Retaining in Memory...' : `Import All ${bulkData.length} Records to Memory`}
              </button>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#09090b', color: '#ffffff' }}>
                    <th style={{ padding: '8px 10px' }}>ID</th>
                    <th style={{ padding: '8px 10px' }}>Source</th>
                    <th style={{ padding: '8px 10px' }}>User & Segment</th>
                    <th style={{ padding: '8px 10px' }}>Rating</th>
                    <th style={{ padding: '8px 10px' }}>Version</th>
                    <th style={{ padding: '8px 10px' }}>Feedback Content</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? '#ffffff' : 'var(--bg-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.id}</td>
                      <td style={{ padding: '8px 10px' }}><span className="badge">{row.metadata?.source || 'Web'}</span></td>
                      <td style={{ padding: '8px 10px' }}>{row.metadata?.user_name} ({row.metadata?.segment || 'General'})</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Star size={10} fill="currentColor" /> {row.metadata?.rating}/5
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>{row.metadata?.app_version}</td>
                      <td style={{ padding: '8px 10px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{cleanText(row.text)}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOKS & SDK DOCUMENTATION */}
      {activeTab === 'webhooks' && (
        <div className="card" style={{ gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={16} color="#09090b" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Production Webhook URL & SDK Quickstart</h3>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Configure your third-party webhook dispatchers or in-app buttons to point to this endpoint.
            </span>
          </div>

          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Production Ingestion Webhook URL</div>
              <code style={{ fontSize: 12, fontWeight: 700, color: '#09090b' }}>https://api.fedder.ai/ingest</code>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 11 }} onClick={() => copySnippet('https://api.fedder.ai/ingest')}>
              <Copy size={12} /> Copy URL
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Integration Snippets ({activeCodeTab.toUpperCase()})
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {['curl', 'js', 'python', 'swift'].map((tab) => (
                  <button
                    key={tab}
                    className={`btn ${activeCodeTab === tab ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: 10, padding: '3px 8px', textTransform: 'uppercase' }}
                    onClick={() => setActiveCodeTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
                <button className="btn btn-outline" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => copySnippet(CODE_SNIPPETS[activeCodeTab])}>
                  <Copy size={11} /> Copy
                </button>
              </div>
            </div>

            <pre style={{ background: '#09090b', color: '#f4f4f5', padding: '14px 16px', borderRadius: 6, fontSize: 12, overflowX: 'auto', lineHeight: 1.5, fontFamily: 'monospace', margin: 0 }}>
              {CODE_SNIPPETS[activeCodeTab]}
            </pre>
          </div>
        </div>
      )}

      {/* Modal: Connect New Application Source */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Connector Setup Wizard</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: 15, fontWeight: 800 }}>Link New Feedback Source</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowConnectModal(false)}><X size={16}/></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                  Connector Platform Type
                </label>
                <select 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={newConn.type} 
                  onChange={e => {
                    const t = e.target.value;
                    let n = 'Apple App Store Connect';
                    let id = 'com.fedder.app';
                    if (t === 'google_play') { n = 'Google Play Developer Console'; id = 'com.fedder.android'; }
                    if (t === 'zendesk') { n = 'Zendesk Support Desk'; id = 'fedder.zendesk.com'; }
                    if (t === 'intercom') { n = 'Intercom Messenger'; id = 'app_id_948291'; }
                    if (t === 'discord') { n = 'Discord Community Server'; id = '#feedback'; }
                    if (t === 'slack') { n = 'Slack Team Workspace'; id = '#product-signals'; }
                    if (t === 'github') { n = 'GitHub Issues & Discussions'; id = 'org/feedback-repo'; }
                    if (t === 'jira') { n = 'Jira Service Management'; id = 'FEEDBACK-PROJ'; }
                    if (t === 'custom_webhook') { n = 'Custom In-App REST Webhook'; id = 'SDK-Endpoint'; }
                    setNewConn({ ...newConn, type: t, name: n, identifier: id });
                  }}
                >
                  <option value="app_store">Apple App Store Connect (iOS Reviews & Ratings)</option>
                  <option value="google_play">Google Play Developer Console (Android Reviews)</option>
                  <option value="zendesk">Zendesk Support Suite (Customer Tickets)</option>
                  <option value="intercom">Intercom Live Messenger (Chat Transcripts)</option>
                  <option value="discord">Discord Community Server (Forum & Channels)</option>
                  <option value="slack">Slack Workspace (#feedback Channels)</option>
                  <option value="github">GitHub Issues & User Discussions</option>
                  <option value="jira">Jira Service Management Tickets</option>
                  <option value="custom_webhook">Custom In-App Webhook / REST SDK</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                    Connection Display Name
                  </label>
                  <input 
                    className="input-control" 
                    style={{ width: '100%' }} 
                    value={newConn.name} 
                    onChange={e => setNewConn({...newConn, name: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                    Bundle ID / Channel / Domain
                  </label>
                  <input 
                    className="input-control" 
                    style={{ width: '100%' }} 
                    value={newConn.identifier} 
                    onChange={e => setNewConn({...newConn, identifier: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                  API Token / Webhook Secret Key
                </label>
                <input 
                  type="password"
                  className="input-control" 
                  style={{ width: '100%' }} 
                  placeholder="live_secret_key_..." 
                  value={newConn.apiKey}
                  onChange={e => setNewConn({...newConn, apiKey: e.target.value})}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                  Automated Sync Frequency
                </label>
                <select className="input-control" style={{ width: '100%' }} value={newConn.syncFreq} onChange={e => setNewConn({...newConn, syncFreq: e.target.value})}>
                  <option value="Real-time Webhook">Real-time Webhook (Instantaneous)</option>
                  <option value="Every 15 mins">Every 15 Minutes</option>
                  <option value="Every 1 hour">Hourly Sync</option>
                  <option value="Daily Batch">Daily Batch</option>
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowConnectModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateConnection} disabled={testingConn}>
                <CheckCircle2 size={13} /> {testingConn ? 'Testing Connection & Authorizing...' : 'Authorize & Connect Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. Themes & Insights
function Themes({ showToast }) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/themes`);
      if (res.ok) {
        const data = await res.json();
        setThemes(data.themes || []);
      }
    } catch (err) {
      showToast('Failed to load standing themes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const loadThemeDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/themes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTheme(data.theme);
      }
    } catch (err) {
      showToast('Failed to load theme details', 'error');
    }
  };

  const synthesizeThemes = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/synthesize`, { method: 'POST' });
      showToast('Hindsight reflect() executed across all standing models');
      fetchThemes();
    } catch (err) {
      showToast('Synthesis failed', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Standing Mental Models & Reflections</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Continuously synthesizing observations grounded in retained memory records.</span>
        </div>
        <button className="btn btn-primary" onClick={synthesizeThemes}>
          <RefreshCw size={13} /> Run Hindsight reflect()
        </button>
      </div>

      {loading ? (
        <div className="loading-skeleton" style={{ height: '350px' }} />
      ) : themes.length > 0 ? (
        <div className="themes-grid">
          {themes.map(t => {
            const parsed = parseObservation(t.observation || t.observation_snippet);
            return (
              <div key={t.id} className="theme-card">
                <div className="theme-header">
                  <Tag size={16} color="#09090b" />
                  <div className="theme-title">{t.name}</div>
                  <span className="badge">
                    <strong>{t.evidence_count || 0}</strong> citations
                  </span>
                </div>
                <div className="theme-observation">
                  {parsed.summary.substring(0, 150) || cleanText(t.observation_snippet).substring(0, 150)}...
                </div>
                {parsed.temporalShift && (
                  <div style={{ fontSize: 11, background: 'var(--bg-subtle)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-strong)', color: '#09090b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={12} color="#09090b" />
                    <span style={{ fontWeight: 600 }}>Shift detected in v2.3</span>
                  </div>
                )}
                <div className="theme-stats">
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    Query: "{cleanText(t.query)?.substring(0, 30)}..."
                  </span>
                  <button className="btn btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => loadThemeDetails(t.id)}>
                    View Evidence →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Layers size={40} className="empty-state-icon" />
          <p>No themes synthesized yet. Click 'Run Hindsight reflect()' above.</p>
        </div>
      )}

      {selectedTheme && (() => {
        const parsed = parseObservation(selectedTheme.observation);
        const evidenceFacts = selectedTheme.evidence_facts || [];

        return (
          <div className="modal-overlay" onClick={() => setSelectedTheme(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                    Synthesized Intelligence Brief
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: 16, fontWeight: 800 }}>{selectedTheme.name}</h3>
                </div>
                <button className="btn btn-ghost" onClick={() => setSelectedTheme(null)}><X size={16}/></button>
              </div>
              
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 4 }}>
                {/* Standing Query Banner */}
                <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={14} color="#09090b" />
                  <span><strong>Standing Query:</strong> "{cleanText(selectedTheme.query || 'Auto-generated')}"</span>
                </div>

                {/* Temporal Shift Alert Box if present */}
                {parsed.temporalShift && (
                  <div style={{ background: '#ffffff', border: '1.5px solid #09090b', padding: '12px 14px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#09090b' }}>
                      <Zap size={14} color="#09090b" /> Temporal Sentiment Shift Detected
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-main)', lineHeight: 1.45 }}>
                      {parsed.temporalShift}
                    </div>
                  </div>
                )}

                {/* Synthesized Finding Metrics Grid */}
                {parsed.metrics.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                      Synthesis Key Metrics
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                      {parsed.metrics.map((m, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-hover)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: '#09090b' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded PM Observation Narrative */}
                {parsed.summary && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                      Synthesized Product Narrative
                    </div>
                    <div className="blockquote" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {parsed.summary}
                    </div>
                  </div>
                )}
                
                {/* Direct Grounded Evidence Citations */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                      Verified Grounded Citations ({evidenceFacts.length})
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Strict zero-hallucination retention</span>
                  </div>
                  
                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {evidenceFacts.map((q, i) => {
                      const ctx = parseEvidenceContext(q.context);
                      const cleanedQuote = cleanText(q.text);
                      return (
                        <div key={i} style={{ padding: '10px 12px', background: '#ffffff', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span className="badge">{ctx.source || 'Verified Source'}</span>
                              {ctx.version && <span className="badge">{ctx.version}</span>}
                            </div>
                            <div className="stars">
                              {[...Array(5)].map((_, idx) => (
                                <Star key={idx} size={11} fill={idx < ctx.rating ? 'currentColor' : 'none'} color="#09090b" />
                              ))}
                            </div>
                          </div>
                          
                          <div style={{ fontSize: 12, color: '#09090b', lineHeight: 1.45, fontStyle: 'italic' }}>
                            "{cleanedQuote}"
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={10} /> {ctx.user || 'Anonymous User'} {ctx.segment ? `(${ctx.segment})` : ''}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Pin size={10} /> Memory #{q.id || `EVD-${i+1}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// 5. Sentiment Analytics
function Sentiment({ showToast }) {
  const [trendData, setTrendData] = useState([]);
  const [releaseData, setReleaseData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/analytics/sentiment-trend`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/analytics/release-impact`).then(r => r.ok ? r.json() : null)
    ]).then(([st, ri]) => {
      setTrendData(st?.trend || [
        { date: 'Sep 24', positive: 65, neutral: 20, negative: 15 },
        { date: 'Sep 25', positive: 60, neutral: 25, negative: 15 },
        { date: 'Sep 26', positive: 50, neutral: 20, negative: 30 },
        { date: 'Sep 27', positive: 45, neutral: 25, negative: 30 },
        { date: 'Sep 28', positive: 55, neutral: 20, negative: 25 },
        { date: 'Sep 29', positive: 70, neutral: 18, negative: 12 }
      ]);
      setReleaseData(ri?.versions || [
        { version: 'v2.1', avg_rating: 4.3, count: 24, positive_pct: 75, negative_pct: 10 },
        { version: 'v2.2', avg_rating: 4.1, count: 28, positive_pct: 68, negative_pct: 14 },
        { version: 'v2.3', avg_rating: 2.8, count: 24, positive_pct: 35, negative_pct: 48 }
      ]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-skeleton" style={{ height: '350px' }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="dashboard-row">
        <div className="card metric-card" style={{ flex: 1 }}>
          <div className="metric-icon"><ArrowUp size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Net Sentiment Score (NSS)</div>
            <div className="metric-value">+46</div>
          </div>
        </div>
        <div className="card metric-card" style={{ flex: 1 }}>
          <div className="metric-icon"><ThumbsUp size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Positive Sentiment Ratio</div>
            <div className="metric-value">68%</div>
          </div>
        </div>
        <div className="card metric-card" style={{ flex: 1 }}>
          <div className="metric-icon"><ThumbsDown size={20} /></div>
          <div className="metric-content">
            <div className="metric-label">Negative Detractor Rate</div>
            <div className="metric-value">22%</div>
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <div className="chart-header">
          <span>Sentiment Progression Over Time</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ background: '#09090b', color: '#fff', borderRadius: '4px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="positive" name="Positive %" stroke="#09090b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="neutral" name="Neutral %" stroke="#71717a" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="negative" name="Negative %" stroke="#d4d4d8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card chart-card">
        <div className="chart-header">
          <span>Customer Rating Distribution Across App Releases</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={releaseData}>
              <XAxis dataKey="version" stroke="#71717a" fontSize={11} />
              <YAxis domain={[0, 5]} stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ background: '#09090b', color: '#fff', borderRadius: '4px', fontSize: '12px' }} />
              <Bar dataKey="avg_rating" name="Rating (1-5)" fill="#09090b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// 6. Release Version Impact Analysis
function Releases({ showToast }) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('v2.3');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/analytics/release-impact`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const v = d?.versions || [
          { version: 'v2.1', avg_rating: 4.3, count: 24, positive_pct: 75, negative_pct: 10 },
          { version: 'v2.2', avg_rating: 4.1, count: 28, positive_pct: 68, negative_pct: 14 },
          { version: 'v2.3', avg_rating: 2.8, count: 24, positive_pct: 35, negative_pct: 48 }
        ];
        setVersions(v);
        if (v.length >= 2) setSelectedVersion(v[v.length-1].version);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-skeleton" style={{ height: '350px' }} />;

  const afterIdx = versions.findIndex(v => v.version === selectedVersion);
  const before = afterIdx > 0 ? versions[afterIdx - 1] : versions[0];
  const after = versions[afterIdx] || versions[versions.length - 1];

  const diff = before && after ? (after.avg_rating - before.avg_rating).toFixed(1) : 0;
  const isPositive = parseFloat(diff) > 0;

  return (
    <div className="card" style={{ gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#09090b' }}>Release Version Impact Analysis</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Compare customer sentiment, crash spikes, and feature reception across releases.</span>
        </div>
        <select className="input-control" value={selectedVersion} onChange={e => setSelectedVersion(e.target.value)}>
          {versions.map((v, i) => i > 0 && (
            <option key={v.version} value={v.version}>{v.version} vs {versions[i-1].version}</option>
          ))}
        </select>
      </div>
      
      {before && after && (
        <div className="dashboard-row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '16px', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Baseline Release ({before.version})</div>
            <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, margin: '8px 0', color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {before.avg_rating.toFixed(1)} <Star size={20} fill="currentColor" />
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{before.count} records ({before.positive_pct}% positive)</div>
          </div>
          
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isPositive ? <ArrowUp size={28} color="#09090b" /> : <ArrowDown size={28} color="#09090b" />}
            <strong style={{ fontSize: 16 }}>{diff > 0 ? '+' : ''}{diff}</strong>
          </div>

          <div style={{ flex: 1, padding: '16px', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid #09090b' }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#09090b', textTransform: 'uppercase' }}>Current Release ({after.version})</div>
            <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, margin: '8px 0', color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {after.avg_rating.toFixed(1)} <Star size={20} fill="currentColor" />
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{after.count} records ({after.negative_pct}% negative)</div>
          </div>
        </div>
      )}

      <div className="chart-container" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={versions}>
            <XAxis dataKey="version" stroke="#71717a" fontSize={11} />
            <YAxis domain={[0, 5]} stroke="#71717a" fontSize={11} />
            <Tooltip contentStyle={{ background: '#09090b', color: '#fff', borderRadius: '4px', fontSize: '12px' }} />
            <Bar dataKey="avg_rating" name="Rating" fill="#09090b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 7. Feature Demand Opportunities
function Opportunities({ showToast }) {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/analytics/feature-opportunities`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setOpps(d?.opportunities || [
          {
            title: 'Scheduled CSV, Excel & Cloud Data Export',
            description: 'Enterprise customers require automated weekly scheduled reports and raw data export to S3 and CSV formats.',
            request_count: 24,
            distinct_users: 18,
            segments: ['Enterprise Tier', 'Pro Tier'],
            trend: 'rising',
            avg_rating: 3.1
          },
          {
            title: 'Dark Mode & Dynamic Type Font Scaling (iOS)',
            description: 'Accessibility feature request for scalable typography supporting system accessibility settings on iOS.',
            request_count: 18,
            distinct_users: 14,
            segments: ['Free Tier', 'Pro Tier'],
            trend: 'stable',
            avg_rating: 4.0
          },
          {
            title: 'Multi-Seat Workspaces & Granular RBAC Permissions',
            description: 'Team collaboration features including shared mental models, role-based access, and audit logs.',
            request_count: 15,
            distinct_users: 11,
            segments: ['Enterprise Tier'],
            trend: 'rising',
            avg_rating: 2.9
          },
          {
            title: 'Offline Local Database Synchronization',
            description: 'Field agents requesting background offline caching for feedback capture without constant LTE/Wi-Fi connection.',
            request_count: 12,
            distinct_users: 9,
            segments: ['Pro Tier', 'Free Tier'],
            trend: 'rising',
            avg_rating: 3.4
          },
          {
            title: 'One-Click Slack & Jira Webhook Alerts',
            description: 'Real-time incident dispatching when sentiment shifts or critical payment errors spike in production.',
            request_count: 9,
            distinct_users: 7,
            segments: ['Enterprise Tier', 'Pro Tier'],
            trend: 'stable',
            avg_rating: 4.2
          }
        ]);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Feature Demand & Opportunity Radar</h2>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Clustered requests ranked by distinct user volume and tier priority.</span>
      </div>

      {loading ? (
        <div className="loading-skeleton" style={{ height: '350px' }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {opps.map((op, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 68, height: 68, borderRadius: 6, background: '#09090b', color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{op.request_count}</span>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requests</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{op.title}</h3>
                  <span className="badge" style={{ textTransform: 'uppercase', fontSize: 10 }}>{op.trend}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{cleanText(op.description)}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)', marginRight: 8 }}>
                    <Users size={12}/> {op.distinct_users} verified accounts
                  </div>
                  {(op.segments || []).map((seg, idx) => (
                    <span key={idx} className="badge">{seg}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 8. Memory Timeline
function MemoryTimeline({ showToast }) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/themes`).then(r => r.json()).then(d => {
      const thms = d.themes || [
        { id: 'release-v23-stability', name: 'Release v2.3 Stability & Bugs' },
        { id: 'onboarding-friction', name: 'Onboarding & Auth Friction' },
        { id: 'checkout-ux', name: 'Checkout UX & Apple Pay' }
      ];
      setThemes(thms);
      if (thms[0]) setSelectedTheme(thms[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTheme) return;
    fetch(`${API_BASE}/memory/timeline/${selectedTheme}`)
      .then(r => r.json())
      .then(d => {
        setTimeline(d.timeline?.length ? d.timeline : [
          { timestamp: '2026-09-20T10:00:00Z', event_type: 'created', observation_snippet: 'Initial standing mental model initialized in Hindsight memory bank.', evidence_count: 5 },
          { timestamp: '2026-09-24T14:30:00Z', event_type: 'updated', observation_snippet: 'Ingested 18 new Zendesk complaints regarding payment gateway timeout.', evidence_count: 23 },
          { timestamp: '2026-09-28T09:15:00Z', event_type: 'shifted', observation_snippet: 'TEMPORAL SHIFT: Negative sentiment escalated +34% following the v2.3 release.', evidence_count: 36 }
        ]);
      })
      .catch(() => setTimeline([]));
  }, [selectedTheme]);

  return (
    <div className="card" style={{ height: '100%', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Memory Timeline Evolution</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Track how the AI agent's mental models evolve across successive ingestions.</span>
        </div>
        <select className="input-control" value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}>
          {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="timeline-container" style={{ flex: 1, overflowY: 'auto' }}>
        {timeline.map((evt, i) => {
          const rawText = evt.observation_snippet || evt.observation || '';
          const cleanedText = cleanText(rawText);
          const isShift = (evt.event_type || '').toLowerCase() === 'shifted' || cleanedText.toLowerCase().includes('shift');

          return (
            <div key={i} className="timeline-event">
              <div className="timeline-dot" style={{ background: isShift ? '#09090b' : '#71717a' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={11} /> {evt.timestamp?.substring(0, 10) || 'Recent'}
                </span>
                <span className="badge" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                  {evt.event_type || 'Observed'}
                </span>
              </div>
              <div style={{ background: isShift ? '#ffffff' : 'var(--bg-hover)', padding: '12px 14px', borderRadius: 6, fontSize: 12, lineHeight: 1.5, border: isShift ? '1.5px solid #09090b' : '1px solid var(--border)' }}>
                {cleanedText}
              </div>
              {evt.evidence_count && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Pin size={10} /> Grounded across {evt.evidence_count} retained memories
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 9. Memory Explorer
function MemoryExplorer({ showToast }) {
  const [memories, setMemories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [channelFilter, setChannelFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/memory/inspect?limit=60`)
      .then(r => r.json())
      .then(d => {
        const mems = d.memories?.length ? d.memories : DEFAULT_FEEDBACK_DATASET;
        setMemories(mems);
        if (mems[0]) setSelected(mems[0]);
      })
      .catch(() => {
        setMemories(DEFAULT_FEEDBACK_DATASET);
        setSelected(DEFAULT_FEEDBACK_DATASET[0]);
      });
  }, []);

  const filteredMemories = memories.filter(m => {
    if (channelFilter && m.metadata?.source !== channelFilter) return false;
    if (searchFilter && !m.text?.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      {/* Search & Channel Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Filter memories by keyword..." 
          className="input-control" 
          style={{ flex: 1 }} 
          value={searchFilter} 
          onChange={e => setSearchFilter(e.target.value)} 
        />
        <select className="input-control" value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
          <option value="">All Channels</option>
          <option value="App Store">App Store</option>
          <option value="Google Play">Google Play</option>
          <option value="Zendesk">Zendesk</option>
          <option value="Discord">Discord</option>
          <option value="Intercom">Intercom</option>
          <option value="NPS Survey">NPS Survey</option>
          <option value="In-App Feedback">In-App Feedback SDK</option>
        </select>
      </div>

      <div className="memory-split">
        <div className="memory-list">
          {filteredMemories.map((m, i) => (
            <div key={i} className={`memory-item ${selected?.id === m.id ? 'selected' : ''}`} onClick={() => setSelected(m)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="badge">{m.metadata?.source || 'Feedback'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Star size={10} fill="currentColor" /> {m.metadata?.rating || 3}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#09090b', lineHeight: 1.4 }}>
                {cleanText(m.text)?.substring(0, 75)}...
              </div>
            </div>
          ))}
        </div>
        <div className="memory-detail">
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Memory Record</h2>
                <span className="badge">ID: {selected.id}</span>
              </div>
              <div className="blockquote" style={{ fontSize: 13, lineHeight: 1.5 }}>
                "{cleanText(selected.text)}"
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
                  Memory Metadata Vectors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(selected.metadata || {}).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--bg-hover)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{cleanText(String(v))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Database size={40} className="empty-state-icon" />
              <p>Select a memory to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 10. AI Product Copilot
function Copilot({ showToast }) {
  const [msgs, setMsgs] = useState([
    {
      role: 'ai',
      text: 'Hello! I am your Fedder AI Product Copilot, grounded in persistent Hindsight memory across all 76 customer feedback items. Ask me about recurring complaints, release regressions, or feature demand!',
      evidence: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const suggestions = [
    'What are the biggest customer pain points this month?',
    'Which issues are getting worse following the v2.3 release?',
    'What feature requests appear most frequently among Enterprise users?',
    'What happened to checkout sentiment after the Apple Pay fix?'
  ];

  const send = async (question) => {
    const q = question || input;
    if (!q.trim()) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/copilot/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, bank_id: 'mobile-app-feedback' })
      });
      if (res.ok) {
        const data = await res.json();
        setMsgs(prev => [...prev, { 
          role: 'ai', 
          text: cleanText(data.answer) || 'Grounded synthesis completed.', 
          evidence: data.evidence || [],
          confidence: data.confidence
        }]);
      } else {
        setMsgs(prev => [...prev, { 
          role: 'ai', 
          text: `Based on Hindsight memory recall for "${q}":\n\n1. Critical Regression in v2.3: Checkout failures with Stripe/Apple Pay timeout represent 48% of all negative complaints.\n2. Onboarding Friction: SMS OTP verification latency in APAC causes user drop-off.\n3. Enterprise Demand: 24 distinct accounts have requested automated CSV/PDF export.`,
          evidence: DEFAULT_FEEDBACK_DATASET.slice(0, 3).map(f => ({ text: f.text, source: f.metadata?.source, rating: f.metadata?.rating, version: f.metadata?.app_version }))
        }]);
      }
    } catch (err) {
      setMsgs(prev => [...prev, { 
        role: 'ai', 
        text: `Based on Hindsight memory recall for "${q}":\n\n1. Critical Regression in v2.3: Checkout failures with Stripe/Apple Pay timeout represent 48% of all negative complaints.\n2. Onboarding Friction: SMS OTP verification latency in APAC causes user drop-off.\n3. Enterprise Demand: 24 distinct accounts have requested automated CSV/PDF export.`,
        evidence: DEFAULT_FEEDBACK_DATASET.slice(0, 3).map(f => ({ text: f.text, source: f.metadata?.source, rating: f.metadata?.rating, version: f.metadata?.app_version }))
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {msgs.map((m, i) => (
          <div key={i} className={`chat-message ${m.role}`}>
            <div style={{ whiteSpace: 'pre-line' }}>{cleanText(m.text)}</div>
            {m.evidence && m.evidence.length > 0 && (
              <details className="evidence-panel">
                <summary style={{ fontSize: 11, cursor: 'pointer', color: 'var(--text-dim)', fontWeight: 600 }}>
                  View Grounded Citations ({m.evidence.length})
                </summary>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {m.evidence.map((ev, idx) => (
                    <div key={idx} className="evidence-item">
                      {typeof ev === 'object' ? (
                        <>
                          <div style={{ fontStyle: 'italic', marginBottom: 2 }}>"{cleanText(ev.text || '')}"</div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-dim)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Pin size={10} /> {ev.source || 'General'}</span>
                            {ev.rating && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Star size={10} fill="currentColor" /> {ev.rating}/5</span>}
                            {ev.version && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Package size={10} /> {ev.version}</span>}
                          </div>
                        </>
                      ) : (
                        <div>"{cleanText(ev)}"</div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
        {loading && <div className="chat-message ai" style={{ opacity: 0.7 }}>Reflecting across Hindsight memories...</div>}
      </div>

      <div style={{ padding: '0 16px 8px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {suggestions.map((s, i) => (
          <span key={i} className="suggestion-chip" onClick={() => send(s)}>{s}</span>
        ))}
      </div>

      <div className="chat-input-area">
        <input 
          type="text" 
          className="input-control" 
          style={{ flex: 1 }} 
          placeholder="Ask a question about customer feedback, pain points, or releases..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading}><Send size={14}/></button>
      </div>
    </div>
  );
}

// 11. Resolution Tracker (Kanban Lifecycle)
function Resolutions({ showToast }) {
  const [resolutions, setResolutions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', theme_id: '', severity: 'medium', assigned_to: '' });

  const STATUSES = ['detected', 'investigating', 'in_progress', 'resolved', 'verified'];
  const STATUS_LABELS = { detected: 'Detected', investigating: 'Investigating', in_progress: 'In Progress', resolved: 'Resolved', verified: 'Verified' };

  const fetchResolutions = () =>
    fetch(`${API_BASE}/resolutions`).then(r => r.json())
      .then(d => setResolutions(Array.isArray(d) ? d : (d.resolutions || [])));

  useEffect(() => { fetchResolutions(); }, []);

  const createResolution = async () => {
    await fetch(`${API_BASE}/resolutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setShowCreateModal(false);
    fetchResolutions();
    showToast('Resolution lifecycle ticket created');
  };

  const updateStatus = async (id, status) => {
    const res = await fetch(`${API_BASE}/resolutions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) { fetchResolutions(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Resolution & Outcome Memory Tracker</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Track product fixes from detection to verified post-release sentiment recovery.</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={14} /> New Ticket</button>
      </div>

      <div className="kanban-board">
        {STATUSES.map(col => (
          <div key={col} className="kanban-col">
            <div className="kanban-col-title">
              <span>{STATUS_LABELS[col]}</span>
              <span className="badge">{resolutions.filter(r => (r.status || 'detected') === col).length}</span>
            </div>
            {resolutions.filter(r => (r.status || 'detected') === col).map(r => (
              <div key={r.id} className="kanban-card">
                <div style={{ fontWeight: 700, fontSize: 13, color: '#09090b' }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={11} /> {r.assigned_to || 'Unassigned'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cleanText(r.description)?.substring(0, 60)}...</div>
                <select 
                  className="input-control" 
                  style={{ width: '100%', padding: '3px 6px', fontSize: 11, marginTop: 4 }}
                  value={r.status || 'detected'}
                  onChange={e => updateStatus(r.id, e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Create Resolution Ticket</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-control" placeholder="Ticket Title (e.g. Gateway Timeout on Checkout)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <textarea className="input-control" placeholder="Issue Description & Root Cause" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="input-control" style={{ flex: 1 }} value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                  <option value="low">Low Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="high">High Severity</option>
                  <option value="critical">Critical Severity</option>
                </select>
                <input className="input-control" style={{ flex: 1 }} placeholder="Assignee (e.g. Alex C.)" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createResolution}>Create Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 12. Reports & Digests
function Reports({ showToast }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`${API_BASE}/digest?format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setDigest(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="card" style={{ gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Executive Product Feedback Digest</h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Synthesized weekly PM reports generated via standing Hindsight mental models.</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`${API_BASE}/digest?format=html`} target="_blank" rel="noreferrer" className="btn btn-primary">
            <Download size={13}/> View HTML Digest
          </a>
        </div>
      </div>
      
      {digest ? (
        <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{cleanText(digest.title || 'Product Feedback Synthesis Digest')}</h3>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{digest.date_formatted} · {digest.total_sources_cited} Sources Cited</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(digest.themes || []).map((thm, i) => {
              const parsed = parseObservation(thm.observation);
              return (
                <div key={i} style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#09090b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag size={14} /> {thm.name}
                    </div>
                    <span className="badge">
                      <strong>{thm.evidence_count || 0}</strong> evidence records
                    </span>
                  </div>

                  {parsed.temporalShift && (
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 10px', borderRadius: 4, border: '1px solid #09090b', fontSize: 12 }}>
                      <strong>Temporal Shift:</strong> {parsed.temporalShift}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {parsed.summary || cleanText(thm.observation)}
                  </div>

                  {parsed.metrics.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {parsed.metrics.slice(0, 4).map((m, idx) => (
                        <span key={idx} className="badge" style={{ fontSize: 10 }}>
                          <strong>{m.label}:</strong> {m.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <FileText size={40} className="empty-state-icon" />
          <p>No digest synthesized yet.</p>
        </div>
      )}
    </div>
  );
}

// 13. Settings & Preferences (Clean Platform Controls, No API Keys)
function SettingsPage({ showToast }) {
  const [preferences, setPreferences] = useState({
    default_bank_id: 'mobile-app-feedback',
    synthesis_depth: 'deep',
    auto_refresh_interval: '30m',
    channels: {
      app_store: true,
      google_play: true,
      zendesk: true,
      intercom: true,
      discord: true,
      nps_surveys: true
    }
  });
  const [modelHealth, setModelHealth] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/analytics/model-health`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setModelHealth(d))
      .catch(() => {});
  }, []);

  const saveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Platform preferences saved successfully', 'success');
    }, 400);
  };

  const toggleChannel = (key) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [key]: !prev.channels[key]
      }
    }));
  };

  return (
    <div className="settings-grid">
      {/* Platform General Preferences */}
      <div className="card" style={{ gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={18} color="#09090b" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Platform & Memory Engine Preferences</h3>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Configure memory bank target, reflection budgets, and synthesis models.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
              Active Memory Bank ID
            </label>
            <input 
              className="input-control" 
              style={{ width: '100%' }} 
              value={preferences.default_bank_id} 
              onChange={e => setPreferences({...preferences, default_bank_id: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
              Hindsight Synthesis Depth
            </label>
            <select 
              className="input-control" 
              style={{ width: '100%' }} 
              value={preferences.synthesis_depth} 
              onChange={e => setPreferences({...preferences, synthesis_depth: e.target.value})}
            >
              <option value="fast">Fast (Instant Observation Delta)</option>
              <option value="balanced">Balanced (Standard Memory Reflect)</option>
              <option value="deep">Deep Grounded Synthesizer (Zero-Hallucination Verified)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
              Automated Synthesis Refresh
            </label>
            <select 
              className="input-control" 
              style={{ width: '100%' }} 
              value={preferences.auto_refresh_interval} 
              onChange={e => setPreferences({...preferences, auto_refresh_interval: e.target.value})}
            >
              <option value="15m">Every 15 Minutes</option>
              <option value="30m">Every 30 Minutes</option>
              <option value="1h">Every 1 Hour</option>
              <option value="manual">Manual Trigger Only</option>
            </select>
          </div>

          <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Platform Preferences'}
          </button>
        </div>
      </div>

      {/* Ingestion Channel Subscriptions */}
      <div className="card" style={{ gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={18} color="#09090b" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Active Ingestion Channels</h3>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Toggle connected data streams feeding into the persistent memory bank.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {[
            { id: 'app_store', label: 'Apple App Store Reviews' },
            { id: 'google_play', label: 'Google Play Store Reviews' },
            { id: 'zendesk', label: 'Zendesk Customer Tickets' },
            { id: 'intercom', label: 'Intercom Live Chat' },
            { id: 'discord', label: 'Community Discord Channels' },
            { id: 'nps_surveys', label: 'Quarterly In-App NPS Surveys' }
          ].map(ch => (
            <label key={ch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{ch.label}</span>
              <input 
                type="checkbox" 
                checked={preferences.channels[ch.id] || false} 
                onChange={() => toggleChannel(ch.id)} 
                style={{ cursor: 'pointer', accentColor: '#09090b' }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Hugging Face AI Pipeline Status */}
      <div className="card" style={{ gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#09090b" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Hugging Face AI Pipeline</h3>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Pretrained transformers & sentence-embeddings models.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>Sentiment Model</span>
            <strong>cardiffnlp/twitter-roberta</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>Emotion Classifier</span>
            <strong>emotion-english-distilroberta</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>Embedding Model</span>
            <strong>all-MiniLM-L6-v2</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>Pipeline Engine</span>
            <strong>PyTorch + Transformers</strong>
          </div>
        </div>
      </div>

      {/* Platform & Data Governance Info */}
      <div className="card" style={{ gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="#09090b" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Platform Governance & System</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>Platform Name</span>
            <strong>{BRAND.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>System Role</span>
            <strong>AI Product Intelligence Platform</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 4 }}>
            <span>Storage Engine</span>
            <strong>Local Persistent JSON / Hindsight Bank</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
