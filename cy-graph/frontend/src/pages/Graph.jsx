import { useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import NetworkGraph from '../components/NetworkGraph/NetworkGraph';
import { useGraph }  from '../hooks/useGraph';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';

const NODE_TYPES = {
  server:      'Server',
  workstation: 'Workstation',
  router:      'Router / Switch',
  database:    'Database',
  iot:         'IoT Device',
};

export default function Graph() {
  const { nodes, setNodes, edges, loading, error } = useGraph();
  const { connected, emit, on, off }               = useSocket();
  const [selectedNode, setSelectedNode]            = useState(null);
  const [logs, setLogs]                            = useState([
    { type: 'safe', msg: 'System initialised',           time: timestamp() },
    { type: 'safe', msg: 'Network topology loaded',      time: timestamp() },
    { type: 'safe', msg: 'All systems nominal',          time: timestamp() },
  ]);

  function timestamp() {
    return new Date().toTimeString().slice(0, 8);
  }

  function addLog(type, msg) {
    setLogs(prev => [...prev, { type, msg, time: timestamp() }]);
  }

  // ── Socket listeners ──────────────────────────────────
  useEffect(() => {
    on('attack:wave', ({ compromised, blocked }) => {
      setNodes(prev => prev.map(n => {
        if (compromised.includes(n._id)) return { ...n, status: 'compromised' };
        return n;
      }));
      compromised.forEach(() => addLog('danger', `Node compromised`));
      blocked.forEach(()     => addLog('warn',   `Node blocked by firewall`));
    });

    on('attack:complete', ({ message }) => {
      addLog('warn', message);
    });

    on('reset:done', ({ nodes: freshNodes }) => {
      setNodes(freshNodes);
      setSelectedNode(null);
      addLog('safe', 'Network reset — all systems nominal');
    });

    on('node:added', ({ node }) => {
      setNodes(prev => [...prev, node]);
      addLog('safe', `Node added: ${node.name}`);
    });

    on('node:updated', ({ node }) => {
      setNodes(prev => prev.map(n => n._id === node._id ? node : n));
    });

    on('attack:spread', ({ message }) => {
      addLog('danger', message);
    });

    return () => {
      off('attack:wave');
      off('attack:complete');
      off('reset:done');
      off('node:added');
      off('node:updated');
      off('attack:spread');
    };
  }, [on, off]);

  // ── Auto scroll log ───────────────────────────────────
  useEffect(() => {
    const el = document.getElementById('attack-log');
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // ── Actions ───────────────────────────────────────────
  function simulateAttack() {
    if (!selectedNode) {
      addLog('warn', 'Select a node first!');
      return;
    }
    if (selectedNode.status === 'compromised') {
      addLog('warn', 'Node already compromised');
      return;
    }
    emit('attack:start', { nodeId: selectedNode._id });
    addLog('danger', `⚡ Attack initiated on ${selectedNode.name}`);
  }

  function resetNetwork() {
    emit('reset:network');
    addLog('safe', 'Reset requested...');
  }

  function addNode() {
    const types = ['server', 'workstation', 'iot'];
    const type  = types[Math.floor(Math.random() * types.length)];
    emit('node:add', {
      name:        `NODE-${Date.now().toString().slice(-4)}`,
      type,
      ip:          `192.168.${Math.floor(Math.random()*5)+1}.${Math.floor(Math.random()*200)+10}`,
      os:          'Unknown',
      hasFirewall: false,
      status:      'warning',
      position:    { x: 400 + Math.random() * 200, y: 300 + Math.random() * 200 },
    });
  }

  // ── Stats ─────────────────────────────────────────────
  const secured     = nodes.filter(n => n.status === 'secure').length;
  const warned      = nodes.filter(n => n.status === 'warning').length;
  const compromised = nodes.filter(n => n.status === 'compromised').length;

  // ── Node click from D3 — wire via window event ────────
  useEffect(() => {
    function handleNodeClick(e) {
      const nodeId = e.detail;
      const found  = nodes.find(n => n._id === nodeId);
      if (found) setSelectedNode(found);
    }
    window.addEventListener('cy-node-click', handleNodeClick);
    return () => window.removeEventListener('cy-node-click', handleNodeClick);
  }, [nodes]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-accent font-mono">
      Loading network topology...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen text-danger font-mono">
      ❌ Error: {error} — Is backend running?
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 56px)' }}>

      {/* ── Graph Canvas ───────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          onNodeClick={setSelectedNode}
        />

        {/* Legend */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: '#060f1edd', border: '1px solid #0d2444',
          padding: '12px', fontSize: '11px',
        }}>
          <div style={{ color: '#00d4ff', fontFamily: 'Rajdhani', fontWeight: 700,
            letterSpacing: 2, marginBottom: 8 }}>LEGEND</div>
          {Object.entries(NODE_TYPES).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center',
              gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%',
                background: {
                  server: '#00d4ff', workstation: '#52b788',
                  router: '#f4a261', database: '#aa44ff', iot: '#ffcc00',
                }[key] }} />
              <span>{label}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #0d2444', marginTop: 8,
            paddingTop: 8, color: '#4a5568' }}>
            Click node → Select<br />Then Simulate Attack
          </div>
        </div>

        {/* Controls */}
        <div style={{
          position: 'absolute', bottom: 16,
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8,
        }}>
          <button onClick={resetNetwork} style={btnStyle('#00d4ff')}>RESET</button>
          <button onClick={addNode}      style={btnStyle('#00d4ff')}>+ ADD NODE</button>
          <button onClick={simulateAttack} style={btnStyle('#ff2244')}>
            ⚡ SIMULATE ATTACK
          </button>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────── */}
      <div style={{
        width: 280, borderLeft: '1px solid #0d2444',
        background: '#060f1e', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Node Info */}
        <div style={{ padding: 14, borderBottom: '1px solid #0d2444' }}>
          <div style={panelTitleStyle}>NODE DETAILS</div>
          {selectedNode ? (
            <>
              <div style={{ fontFamily: 'Orbitron', fontSize: 13,
                color: '#c8e4f8', marginBottom: 8 }}>
                {selectedNode.name}
              </div>
              {[
                ['TYPE',        NODE_TYPES[selectedNode.type]],
                ['IP ADDRESS',  selectedNode.ip],
                ['OS',          selectedNode.os],
                ['FIREWALL',    selectedNode.hasFirewall ? 'ENABLED' : 'DISABLED'],
                ['CONNECTIONS', edges.filter(e =>
                  (typeof e.source === 'object' ? e.source._id : e.source) === selectedNode._id ||
                  (typeof e.target === 'object' ? e.target._id : e.target) === selectedNode._id
                ).length],
                ['STATUS',      selectedNode.status.toUpperCase()],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 10, padding: '3px 0',
                  borderBottom: '1px solid #0d244466',
                }}>
                  <span>{label}</span>
                  <span style={{
                    color: label === 'STATUS'
                      ? selectedNode.status === 'secure'      ? '#52b788'
                      : selectedNode.status === 'compromised' ? '#ff2244' : '#f4a261'
                      : label === 'FIREWALL'
                      ? selectedNode.hasFirewall ? '#52b788' : '#ff2244'
                      : '#c8e4f8',
                    fontWeight: 'bold',
                  }}>{val}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#4a5568' }}>
              Click a node to inspect
            </div>
          )}
        </div>

        {/* Log title */}
        <div style={{ padding: '12px 14px 6px', borderBottom: '1px solid #0d2444' }}>
          <div style={panelTitleStyle}>ATTACK LOG</div>
        </div>

        {/* Log entries */}
        <div id="attack-log" style={{
          flex: 1, overflowY: 'auto', padding: 14,
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{
              fontSize: 10, padding: '3px 0',
              borderBottom: '1px solid #0d244455',
              display: 'flex', gap: 8,
            }}>
              <span style={{ color: '#1a3a5c', flexShrink: 0 }}>{log.time}</span>
              <span style={{
                color: log.type === 'safe'   ? '#52b788'
                     : log.type === 'danger' ? '#ff2244' : '#f4a261',
              }}>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Separate canvas component to avoid re-render issues ──
function GraphCanvas({ nodes, edges, setNodes, onNodeClick }) {
  const svgRef = useRef(null);

  // Import NetworkGraph inline to wire click events
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <NetworkGraphWithClick
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        onNodeClick={onNodeClick}
      />
    </div>
  );
}

import { useRef } from 'react';

function NetworkGraphWithClick({ nodes, edges, setNodes, onNodeClick }) {
  const svgRef        = useRef(null);
  const simulationRef = useRef(null);

  const NODE_COLORS = {
    server:      '#00d4ff',
    workstation: '#52b788',
    router:      '#f4a261',
    database:    '#aa44ff',
    iot:         '#ffcc00',
  };

  const NODE_RADIUS = {
    server: 18, workstation: 14, router: 16, database: 15, iot: 11,
  };

  function getColor(node) {
    if (node.status === 'compromised') return '#ff2244';
    if (node.status === 'warning')     return '#f4a261';
    return NODE_COLORS[node.type] || '#8ab4d4';
  }

  useEffect(() => {
    if (!nodes.length || !edges.length) return;

    const container = svgRef.current.parentElement;
    const W = container.offsetWidth;
    const H = container.offsetHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', W).attr('height', H);

    // Grid
    const defs    = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id','grid2').attr('width',40).attr('height',40)
      .attr('patternUnits','userSpaceOnUse');
    pattern.append('path').attr('d','M 40 0 L 0 0 0 40')
      .attr('fill','none').attr('stroke','#0d244420').attr('stroke-width',0.5);
    svg.append('rect').attr('width','100%').attr('height','100%')
      .attr('fill','url(#grid2)');

    const d3Nodes = nodes.map(n => ({
      ...n, id: n._id,
      x: n.position?.x || W/2,
      y: n.position?.y || H/2,
    }));

    const d3Links = edges.map(e => ({
      source:    typeof e.source === 'object' ? e.source._id : e.source,
      target:    typeof e.target === 'object' ? e.target._id : e.target,
      encrypted: e.encrypted,
    })).filter(e =>
      d3Nodes.find(n => n.id === e.source) &&
      d3Nodes.find(n => n.id === e.target)
    );

    simulationRef.current = d3.forceSimulation(d3Nodes)
      .force('link',    d3.forceLink(d3Links).id(d => d.id).distance(120))
      .force('charge',  d3.forceManyBody().strength(-400))
      .force('center',  d3.forceCenter(W/2, H/2))
      .force('collide', d3.forceCollide(30));

    const link = svg.append('g').selectAll('line')
      .data(d3Links).join('line')
      .attr('stroke','#0d2444').attr('stroke-width',1.5).attr('opacity',0.8);

    const node = svg.append('g').selectAll('g')
      .data(d3Nodes).join('g')
      .attr('cursor','pointer')
      .on('click', (event, d) => {
        const found = nodes.find(n => n._id === d.id);
        if (found) onNodeClick(found);
      })
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulationRef.current.alphaTarget(0);
          api.put(`/api/nodes/${d.id}`, {
            position: { x: Math.round(d.x), y: Math.round(d.y) }
          }).catch(console.error);
          d.fx = null; d.fy = null;
        })
      );

    // Ripple
    node.append('circle').attr('class','ripple')
      .attr('r', d => NODE_RADIUS[d.type]||14)
      .attr('fill','none')
      .attr('stroke', d => getColor(d))
      .attr('opacity', 0);

    // Main circle
    node.append('circle').attr('class','main-circle')
      .attr('r',            d => NODE_RADIUS[d.type]||14)
      .attr('fill',         d => getColor(d)+'22')
      .attr('stroke',       d => getColor(d))
      .attr('stroke-width', 2);

    // Letter
    node.append('text')
      .attr('text-anchor','middle').attr('dominant-baseline','middle')
      .attr('fill', d => getColor(d))
      .attr('font-family','Orbitron,monospace')
      .attr('font-size', d => (NODE_RADIUS[d.type]||14)*0.7)
      .attr('font-weight','bold').attr('pointer-events','none')
      .text(d => d.type[0].toUpperCase());

    // Label
    node.append('text')
      .attr('text-anchor','middle')
      .attr('dy', d => (NODE_RADIUS[d.type]||14)+14)
      .attr('fill', d => getColor(d))
      .attr('font-family','Share Tech Mono,monospace')
      .attr('font-size',9).attr('pointer-events','none')
      .text(d => d.name);

    // No firewall warning
    node.filter(d => !d.hasFirewall).append('text')
      .attr('text-anchor','middle')
      .attr('dy', d => -(NODE_RADIUS[d.type]||14)-6)
      .attr('fill','#f4a261').attr('font-size',9)
      .attr('font-family','Share Tech Mono,monospace')
      .attr('pointer-events','none').text('⚠ NO FW');

    simulationRef.current.on('tick', () => {
      link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
          .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    svgRef.current._node = node;
    svgRef.current._d3Nodes = d3Nodes;

    return () => { if (simulationRef.current) simulationRef.current.stop(); };
  }, [nodes.length, edges.length]);

  // Update colors on status change
  useEffect(() => {
    if (!svgRef.current?._node) return;
    const node = svgRef.current._node;

    node.select('.main-circle').transition().duration(600)
      .attr('stroke', d => {
        const u = nodes.find(n => n._id === d.id);
        return u ? getColor(u) : getColor(d);
      })
      .attr('fill', d => {
        const u = nodes.find(n => n._id === d.id);
        return (u ? getColor(u) : getColor(d)) + '22';
      });

    node.each(function(d) {
      const u = nodes.find(n => n._id === d.id);
      if (u?.status === 'compromised') {
        const ripple = d3.select(this).select('.ripple')
          .attr('stroke','#ff2244');
        function pulse() {
          ripple.attr('opacity',0.8).attr('r', NODE_RADIUS[d.type]||14)
            .transition().duration(1200)
            .attr('r',(NODE_RADIUS[d.type]||14)*3.5).attr('opacity',0)
            .on('end', pulse);
        }
        pulse();
      }
    });
  }, [nodes]);

  return (
    <svg ref={svgRef} style={{ width:'100%', height:'100%', display:'block' }} />
  );
}

// ── Style helpers ─────────────────────────────────────────
function btnStyle(color) {
  return {
    fontFamily:    'Rajdhani, sans-serif',
    fontWeight:    700,
    letterSpacing: 2,
    fontSize:      11,
    padding:       '6px 18px',
    border:        `1px solid ${color}`,
    background:    color + '22',
    color,
    cursor:        'pointer',
    textTransform: 'uppercase',
  };
}

const panelTitleStyle = {
  fontFamily:    'Rajdhani, sans-serif',
  fontWeight:    700,
  fontSize:      10,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color:         '#00d4ff',
  marginBottom:  10,
};