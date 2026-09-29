import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, Background, Controls, MiniMap, 
  useNodesState, useEdgesState, MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Tag, MessageSquare, CheckSquare, Search, RefreshCw, Layers, ZoomIn, ZoomOut, Maximize2, Star } from 'lucide-react';

const API_BASE = '';

// 1. Theme Hub Node (Central Knowledge Pillar)
const ThemeNode = ({ data, selected }) => (
  <div style={{
    background: '#09090b',
    color: '#ffffff',
    border: selected ? '2px solid #71717a' : '1px solid #27272a',
    borderRadius: '24px',
    padding: '8px 16px',
    minWidth: '160px',
    boxShadow: selected ? '0 0 0 4px rgba(9, 9, 11, 0.2)' : '0 4px 12px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff', flexShrink: 0 }}></div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.name || 'Theme Hub'}
      </div>
      <div style={{ fontSize: '9px', color: '#a1a1aa' }}>
        {data.evidence_count || 0} citations
      </div>
    </div>
  </div>
);

// 2. Compact Feedback Node (Orbiting Micro-Node)
const FeedbackNode = ({ data, selected }) => {
  const isNeg = (data.metadata?.rating || 3) <= 2;
  const isPos = (data.metadata?.rating || 3) >= 4;
  const bg = '#ffffff';
  const border = selected ? '#09090b' : '#d4d4d8';
  const tagColor = isNeg ? '#09090b' : isPos ? '#52525b' : '#71717a';

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '16px',
      padding: '4px 10px',
      boxShadow: selected ? '0 0 0 3px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      maxWidth: '180px',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    }}>
      <MessageSquare size={10} color={tagColor} />
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.metadata?.source || 'Feedback'}
      </span>
      <span style={{ fontSize: '9px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Star size={9} fill="currentColor" /> {data.metadata?.rating || 3}
      </span>
    </div>
  );
};

// 3. Resolution Node (Action Fix Node)
const ResolutionNode = ({ data, selected }) => (
  <div style={{
    background: '#f4f4f5',
    border: selected ? '2px solid #09090b' : '1px solid #d4d4d8',
    borderRadius: '6px',
    padding: '6px 12px',
    minWidth: '150px',
    maxWidth: '200px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    cursor: 'pointer'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
      <CheckSquare size={11} color="#09090b" />
      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        Fix · {data.status || 'detected'}
      </span>
    </div>
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {data.title || 'Resolution Ticket'}
    </div>
  </div>
);

const nodeTypes = {
  theme: ThemeNode,
  feedback: FeedbackNode,
  resolution: ResolutionNode
};

export default function MemoryGraph({ bankId = 'mobile-app-feedback', onNodeSelect, selectedNodeId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('full'); // 'full' | 'core' | 'negative' | 'positive'
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({ feedback: 0, theme: 0, resolution: 0, edges: 0 });

  const buildGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, themeRes, resRes] = await Promise.all([
        fetch(`${API_BASE}/memory/inspect?limit=60`).catch(() => null),
        fetch(`${API_BASE}/themes`).catch(() => null),
        fetch(`${API_BASE}/resolutions`).catch(() => null)
      ]);

      const memories = memRes && memRes.ok ? (await memRes.json()).memories || [] : [];
      let themes = themeRes && themeRes.ok ? (await themeRes.json()).themes || [] : [];
      const resData = resRes && resRes.ok ? await resRes.json() : [];
      const resolutions = Array.isArray(resData) ? resData : (resData.resolutions || []);

      if (!themes.length) {
        themes = [
          { id: 'release-v23-stability', name: 'Release v2.3 Stability & Bugs', evidence_count: 24, query: 'checkout crash bugs' },
          { id: 'onboarding-friction', name: 'Onboarding & Auth Friction', evidence_count: 18, query: 'signup SMS OTP login' },
          { id: 'checkout-ux', name: 'Checkout UX & Apple Pay', evidence_count: 15, query: 'payment checkout apple pay' },
          { id: 'pricing-transparency', name: 'Pricing & Subscription Clarity', evidence_count: 11, query: 'pricing tier billing refund' },
          { id: 'feature-requests-export', name: 'Export & Cloud Integrations', evidence_count: 8, query: 'export CSV integrations' }
        ];
      }

      const newNodes = [];
      const newEdges = [];

      // Place central Theme hubs evenly along a graceful ellipse / grid
      const themeCount = themes.length;
      themes.forEach((t, i) => {
        const angle = (i / themeCount) * Math.PI * 2;
        const radiusX = 340;
        const radiusY = 220;
        const x = Math.cos(angle) * radiusX + 450;
        const y = Math.sin(angle) * radiusY + 280;

        newNodes.push({
          id: `theme-${t.id}`,
          type: 'theme',
          position: { x, y },
          data: { ...t }
        });
      });

      // Place Resolutions anchored below their linked theme
      resolutions.forEach((r, i) => {
        const tIndex = themes.findIndex(t => t.id === r.theme_id);
        const parentNode = tIndex >= 0 ? newNodes[tIndex] : newNodes[0];
        const rx = parentNode.position.x + (i % 2 === 0 ? -60 : 60);
        const ry = parentNode.position.y + 110;

        newNodes.push({
          id: `resolution-${r.id}`,
          type: 'resolution',
          position: { x: rx, y: ry },
          data: { ...r }
        });

        newEdges.push({
          id: `e-t-${r.theme_id || 'base'}-r-${r.id}`,
          source: parentNode.id,
          target: `resolution-${r.id}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#09090b' },
          style: { stroke: '#09090b', strokeWidth: 1.5 }
        });
      });

      // Orbit top feedback memories neatly around theme hubs (cap per theme so no clutter)
      const themeSlots = {};
      memories.forEach((m, idx) => {
        let matchedTheme = themes.find(t => 
          (m.metadata?.theme && t.name.toLowerCase().includes(m.metadata.theme.toLowerCase())) ||
          (m.text && t.query && m.text.toLowerCase().includes(t.query.split(' ')[0]))
        ) || themes[idx % themes.length];

        const tId = matchedTheme.id;
        themeSlots[tId] = (themeSlots[tId] || 0) + 1;

        if (themeSlots[tId] <= 5) { // Show up to 5 clean orbiting citations per theme
          const themeNode = newNodes.find(n => n.id === `theme-${tId}`);
          if (themeNode) {
            const orbitAngle = (themeSlots[tId] / 5) * Math.PI * 2;
            const orbitDist = 95 + (idx % 2) * 25;
            const fx = themeNode.position.x + Math.cos(orbitAngle) * orbitDist;
            const fy = themeNode.position.y + Math.sin(orbitAngle) * orbitDist;

            newNodes.push({
              id: `feedback-${m.id || idx}`,
              type: 'feedback',
              position: { x: fx, y: fy },
              data: { ...m }
            });

            newEdges.push({
              id: `e-f-${m.id || idx}-t-${tId}`,
              source: `feedback-${m.id || idx}`,
              target: `theme-${tId}`,
              animated: false,
              style: { stroke: '#d4d4d8', strokeWidth: 1 }
            });
          }
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
      setStats({
        feedback: newNodes.filter(n => n.type === 'feedback').length,
        theme: themes.length,
        resolution: resolutions.length,
        edges: newEdges.length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    buildGraphData();
  }, [buildGraphData]);

  useEffect(() => {
    if (selectedNodeId) {
      setNodes(nds => nds.map(n => ({
        ...n,
        selected: n.id === selectedNodeId
      })));
    } else {
      setNodes(nds => nds.map(n => ({ ...n, selected: false })));
    }
  }, [selectedNodeId, setNodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (viewMode === 'core' && n.type === 'feedback') return false;
      if (viewMode === 'negative' && n.type === 'feedback' && (n.data.metadata?.rating || 3) > 2) return false;
      if (viewMode === 'positive' && n.type === 'feedback' && (n.data.metadata?.rating || 3) < 4) return false;
      if (searchText) {
        const text = (n.data.text || n.data.name || n.data.title || '').toLowerCase();
        if (!text.includes(searchText.toLowerCase())) return false;
      }
      return true;
    });
  }, [nodes, viewMode, searchText]);

  const onNodeClick = useCallback((event, node) => {
    if (onNodeSelect) onNodeSelect(node);
  }, [onNodeSelect]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <div className="graph-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-control"
              placeholder="Search graph nodes..."
              style={{ paddingLeft: 26, width: 200, height: 30 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          
          <div className="filter-btn-group">
            <button className={`filter-btn ${viewMode === 'full' ? 'active' : ''}`} onClick={() => setViewMode('full')}>
              Full Topology ({stats.theme + stats.feedback + stats.resolution})
            </button>
            <button className={`filter-btn ${viewMode === 'core' ? 'active' : ''}`} onClick={() => setViewMode('core')}>
              Core Themes Only ({stats.theme})
            </button>
            <button className={`filter-btn ${viewMode === 'negative' ? 'active' : ''}`} onClick={() => setViewMode('negative')}>
              Critical Pain Points
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline" style={{ height: 30, padding: '0 10px' }} onClick={buildGraphData}>
            <RefreshCw size={12} /> Reset Layout
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="graph-canvas" style={{ flex: 1, width: '100%', height: 'calc(100% - 46px)' }}>
        {loading ? (
          <div className="empty-state" style={{ height: '100%' }}>
            <RefreshCw size={28} className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, fontWeight: 500 }}>Generating memory topology...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ width: '100%', height: '100%', background: '#fafafa' }}
          >
            <Background color="#e4e4e7" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap nodeColor="#09090b" maskColor="rgba(244, 244, 245, 0.7)" />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
