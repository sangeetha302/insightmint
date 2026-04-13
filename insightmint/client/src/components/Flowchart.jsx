import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader2, GitBranch, RefreshCw, Download, ZoomIn, ZoomOut } from 'lucide-react';
const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// â”€â”€ Renders a flowchart from structured data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FlowchartRenderer({ nodes, edges }) {
  const [zoom, setZoom] = useState(1);

  const nodeColors = {
    start:    { bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', text: '#fff', border: 'transparent' },
    end:      { bg: 'linear-gradient(135deg,#4ade80,#22c55e)', text: '#fff', border: 'transparent' },
    process:  { bg: 'var(--bg-card)', text: 'var(--text-primary)', border: 'var(--border-medium)' },
    decision: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
    io:       { bg: 'rgba(34,211,238,0.10)', text: '#22d3ee', border: 'rgba(34,211,238,0.30)' },
  };

  const nodeShapes = {
    start:    'rounded-full px-6 py-2',
    end:      'rounded-full px-6 py-2',
    process:  'rounded-xl px-4 py-3',
    decision: 'rounded-xl px-4 py-3 rotate-0',
    io:       'rounded-lg px-4 py-3',
  };

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-4 justify-end">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
          <ZoomOut size={13} />
        </button>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
          <ZoomIn size={13} />
        </button>
      </div>

      {/* Flowchart */}
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
        <div className="flex flex-col items-center gap-0">
          {nodes.map((node, i) => {
            const colors = nodeColors[node.type] || nodeColors.process;
            const shape  = nodeShapes[node.type]  || nodeShapes.process;
            const edge   = edges.find(e => e.from === node.id);

            return (
              <div key={node.id} className="flex flex-col items-center">
                {/* Node */}
                <div className={`${shape} text-center text-sm font-body font-medium max-w-xs relative animate-fade-in`}
                     style={{
                       background: colors.bg,
                       color: colors.text,
                       border: `1.5px solid ${colors.border}`,
                       boxShadow: node.type === 'start' || node.type === 'end'
                         ? '0 4px 15px rgba(99,102,241,0.30)'
                         : '0 2px 8px rgba(0,0,0,0.15)',
                       animationDelay: `${i * 0.08}s`,
                       minWidth: '180px',
                     }}>
                  {/* Node type label */}
                  {node.type === 'decision' && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(251,191,36,0.20)', color: '#fbbf24', fontSize: '9px' }}>
                      DECISION
                    </span>
                  )}
                  {node.type === 'io' && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', fontSize: '9px' }}>
                      I/O
                    </span>
                  )}
                  {node.label}
                </div>

                {/* Arrow + edge label */}
                {i < nodes.length - 1 && (
                  <div className="flex flex-col items-center" style={{ minHeight: '40px' }}>
                    {edge?.label && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded mt-1 mb-0.5"
                            style={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8' }}>
                        {edge.label}
                      </span>
                    )}
                    <div className="flex flex-col items-center gap-0">
                      <div style={{ width: '2px', height: edge?.label ? '12px' : '20px', background: 'var(--border-strong)' }} />
                      <div style={{
                        width: 0, height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '8px solid var(--border-strong)'
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Flowchart({ topic }) {
  const [flowData, setFlowData]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [flowType, setFlowType]   = useState('concept');

  const FLOW_TYPES = [
    { id: 'concept',   label: 'ðŸ“š Concept Flow',    desc: 'How the topic concepts connect' },
    { id: 'process',   label: 'âš™ï¸ Process Flow',    desc: 'Step-by-step process/algorithm' },
    { id: 'decision',  label: 'ðŸ”€ Decision Tree',   desc: 'Decisions and branches' },
  ];

  const generateFlowchart = async (type = flowType) => {
  setLoading(true);
  setError('');
  setFlowData(null);

  try {
    const { data } = await getFlowchart(topic, type); // âœ… FIXED
    setFlowData(data);
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to generate. Check server is running.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    generateFlowchart();
  }, [topic]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <GitBranch size={18} style={{ color: 'var(--accent-primary)' }} />
          Flowchart â€” {topic}
        </h2>
        <button onClick={() => generateFlowchart()}
          disabled={loading}
          className="btn-ghost py-1.5 px-3 text-sm">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerate
        </button>
      </div>

      {/* Flow type selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FLOW_TYPES.map(ft => (
          <button key={ft.id}
            onClick={() => { setFlowType(ft.id); generateFlowchart(ft.id); }}
            className="px-3 py-2 rounded-xl text-sm font-body transition-all"
            style={{
              background: flowType === ft.id ? 'var(--accent-dim)' : 'var(--bg-card)',
              border: `1.5px solid ${flowType === ft.id ? 'var(--accent-border)' : 'var(--border-default)'}`,
              color: flowType === ft.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: flowType === ft.id ? '600' : '400'
            }}>
            {ft.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
               style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent-border)' }}>
            <GitBranch size={24} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Generating flowchart...
          </p>
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
            AI is mapping out {topic}
          </p>
          <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                   style={{ background: 'var(--accent-primary)', animationDelay: `${i*0.12}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl text-sm font-body"
             style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Flowchart */}
      {flowData && !loading && (
        <div className="glass-card p-6 overflow-x-auto">
          {/* Legend */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {[
              { type: 'start',    label: 'Start/End',  color: '#6366f1' },
              { type: 'process',  label: 'Process',    color: 'var(--text-muted)' },
              { type: 'decision', label: 'Decision',   color: '#fbbf24' },
              { type: 'io',       label: 'Input/Output', color: '#22d3ee' },
            ].map(l => (
              <div key={l.type} className="flex items-center gap-1.5 text-xs font-body"
                   style={{ color: 'var(--text-muted)' }}>
                <div className="w-3 h-3 rounded-sm" style={{ background: l.color, opacity: 0.8 }} />
                {l.label}
              </div>
            ))}
          </div>

          <FlowchartRenderer nodes={flowData.nodes} edges={flowData.edges} />

          {/* Description */}
          {flowData.description && (
            <div className="mt-6 p-4 rounded-xl"
                 style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
              <p className="text-sm font-body" style={{ color: 'var(--text-primary)' }}>
                {flowData.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}