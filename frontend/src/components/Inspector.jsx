import React from 'react';
import { X, MousePointer2, Copy, ExternalLink, Star, Tag, MessageSquare, CheckSquare } from 'lucide-react';

export default function Inspector({ node, onClose }) {
  if (!node) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            Node Inspector
          </h3>
        </div>
        <div className="inspector-empty">
          <MousePointer2 size={28} />
          <p style={{ fontSize: 12, lineHeight: 1.4 }}>Click any node in the graph to inspect persistent memory details</p>
        </div>
      </div>
    );
  }

  const { type, data } = node;

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {type === 'theme' && <Tag size={15} color="#09090b" />}
          {type === 'feedback' && <MessageSquare size={15} color="#09090b" />}
          {type === 'resolution' && <CheckSquare size={15} color="#09090b" />}
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {type} Detail
          </h3>
        </div>
        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Overview</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="badge" style={{ textTransform: 'uppercase', fontSize: 10 }}>
            {type}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>ID: {data.id || 'N/A'}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
          {data.name || data.title || (data.metadata?.source ? `Feedback from ${data.metadata.source}` : 'Memory Entity')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          Timestamp: {data.timestamp?.substring(0, 10) || data.created_at?.substring(0, 10) || 'Active'}
        </div>
      </div>

      {type === 'feedback' && (
        <div className="inspector-section">
          <div className="inspector-section-title">Feedback Content</div>
          <div className="blockquote">
            "{data.text || 'No text content'}"
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Rating</div>
              <div className="stars">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} size={13} fill={idx < (data.metadata?.rating || 3) ? 'currentColor' : 'none'} color="#09090b" />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Sentiment</div>
              <span className="badge">{data.sentiment || 'neutral'}</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Source</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{data.metadata?.source || 'General'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Version</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{data.metadata?.app_version || 'v1.0'}</div>
            </div>
          </div>
        </div>
      )}

      {type === 'theme' && (
        <div className="inspector-section">
          <div className="inspector-section-title">Standing Theme Grounding</div>
          <div style={{ fontSize: 12, marginBottom: 10 }}>
            <strong style={{ display: 'block', color: 'var(--text-dim)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase' }}>Source Query</strong>
            <div style={{ background: 'var(--bg-hover)', padding: '6px 10px', borderRadius: 4, fontStyle: 'italic' }}>
              "{data.query || 'Auto-generated'}"
            </div>
          </div>
          <div style={{ fontSize: 12, marginBottom: 10 }}>
            <strong style={{ display: 'block', color: 'var(--text-dim)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase' }}>Evidence Grounding</strong>
            <span className="badge">
              <strong>{data.evidence_count || 0}</strong> records synthesized
            </span>
          </div>
          <div style={{ fontSize: 12 }}>
            <strong style={{ display: 'block', color: 'var(--text-dim)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase' }}>Current Observation</strong>
            <div style={{ background: 'var(--bg-hover)', padding: 10, borderRadius: 4, lineHeight: 1.5, fontSize: 12, marginTop: 4 }}>
              {data.observation || 'No observation synthesized yet.'}
            </div>
          </div>
        </div>
      )}

      {type === 'resolution' && (
        <div className="inspector-section">
          <div className="inspector-section-title">Resolution Lifecycle</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase' }}>Status</div>
              <span className="badge" style={{ textTransform: 'capitalize' }}>{data.status || 'detected'}</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase' }}>Severity</div>
              <span className="badge" style={{ textTransform: 'capitalize' }}>{data.severity || 'medium'}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3, textTransform: 'uppercase' }}>Assignee</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{data.assigned_to || 'Unassigned'}</div>
            </div>
          </div>
          <div style={{ fontSize: 12 }}>
            <strong style={{ display: 'block', color: 'var(--text-dim)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase' }}>Fix Description</strong>
            <div style={{ background: 'var(--bg-hover)', padding: 10, borderRadius: 4, lineHeight: 1.5, fontSize: 12, marginTop: 4 }}>
              {data.description || 'No description provided.'}
            </div>
          </div>
        </div>
      )}

      <div className="inspector-section" style={{ borderBottom: 'none', marginTop: 'auto' }}>
        <div className="inspector-section-title">Quick Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => data.id && navigator.clipboard.writeText(data.id)}>
            <Copy size={13} /> Copy Entity Identifier
          </button>
        </div>
      </div>
    </div>
  );
}
