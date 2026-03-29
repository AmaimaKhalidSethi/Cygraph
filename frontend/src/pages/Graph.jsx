import { useState, useEffect, useRef } from 'react';
import * as d3       from 'd3';
import api           from '../api/axios';
import { useGraph }  from '../hooks/useGraph';
import { useSocket } from '../hooks/useSocket';
import { useAuth }   from '../context/AuthContext';
import DeviceManager from '../components/DeviceManager/DeviceManager';

// ── Node colors ───────────────────────────────────────
const NODE_COLORS = {
  server:      '#00d4ff',
  workstation: '#52b788',
  router:      '#f4a261',
  database:    '#aa44ff',
  iot:         '#ffcc00',
};

const NODE_RADIUS = {
  server:18, workstation:14, router:16, database:15, iot:11,
};

const NODE_TYPES = {
  server:'Server', workstation:'Workstation',
  router:'Router / Switch', database:'Database', iot:'IoT Device',
};

const zoomBtnStyle = {
  width:         32,
  height:        32,
  background:    '#060f1e',
  border:        '1px solid #0d2444',
  color:         '#00d4ff',
  cursor:        'pointer',
  fontSize:      16,
  fontFamily:    'monospace',
  display:       'flex',
  alignItems:    'center',
  justifyContent:'center',
  transition:    'all 0.2s',
  lineHeight:    1,
};

function getColor(node) {
  if (node.status === 'compromised') return '#ff2244';
  if (node.status === 'warning')     return '#f4a261';
  return NODE_COLORS[node.type] || '#8ab4d4';
}

// ══════════════════════════════════════════════════════
// D3Graph Component — svgRef lives here
// ══════════════════════════════════════════════════════
function D3Graph({ nodes, edges, onNodeClick }) {
  const svgRef        = useRef(null);
  const simulationRef = useRef(null);

  // ── Initial render ────────────────────────────────
  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const W = container.offsetWidth;
    const H = container.offsetHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width',  W)
      .attr('height', H)
      .style('cursor', 'grab');

    // Grid background
    const defs    = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id','grid').attr('width',40).attr('height',40)
      .attr('patternUnits','userSpaceOnUse');
    pattern.append('path')
      .attr('d','M 40 0 L 0 0 0 40').attr('fill','none')
      .attr('stroke','#0d244420').attr('stroke-width',0.5);
    svg.append('rect')
      .attr('width','100%').attr('height','100%')
      .attr('fill','url(#grid)');

    // Main group — zoom/pan applies here
    const mainG = svg.append('g').attr('class','main-group');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        mainG.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Double click — reset zoom
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(500)
        .call(zoom.transform, d3.zoomIdentity);
    });

    // D3 node data
    const d3Nodes = nodes
  .filter(n => n && n._id)  // ← null nodes hatao
  .map(n => ({
    ...n, id: n._id,
    x: n.position?.x || W/2 + (Math.random()-0.5)*300,
    y: n.position?.y || H/2 + (Math.random()-0.5)*300,
  }));

    const d3Links = edges
  .filter(e => e && e.source && e.target)  // ← null edges hatao
  .map(e => ({
    source: typeof e.source === 'object' ? e.source._id : e.source,
    target: typeof e.target === 'object' ? e.target._id : e.target,
    encrypted: e.encrypted,
  })).filter(e =>
    d3Nodes.find(n => n.id === e.source) &&
    d3Nodes.find(n => n.id === e.target)
  );

    // Force simulation
    simulationRef.current = d3.forceSimulation(d3Nodes)
      .force('link',    d3.forceLink(d3Links).id(d => d.id).distance(130))
      .force('charge',  d3.forceManyBody().strength(-450))
      .force('center',  d3.forceCenter(W/2, H/2))
      .force('collide', d3.forceCollide(34));

    // Draw edges
    const link = mainG.append('g').selectAll('line')
      .data(d3Links).join('line')
      .attr('stroke', d => d.encrypted ? '#52b788' : '#0d2444')
      .attr('stroke-width', d => d.encrypted ? 2.5 : 1.5)
      .attr('opacity', d => d.encrypted ? 0.9 : 0.6)
      .attr('stroke-dasharray', d => d.encrypted ? null : '3,3');

    // Draw nodes
    const nodeG = mainG.append('g').selectAll('g')
      .data(d3Nodes).join('g')
      .attr('cursor','pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        const found = nodes.find(n => n._id === d.id);
        if (found) onNodeClick(found);
      })
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulationRef.current.alphaTarget(0);
          api.put(`/api/nodes/${d.id}`, {
            position: { x: Math.round(d.x), y: Math.round(d.y) }
          }).catch(console.error);
          d.fx = null; d.fy = null;
        })
      );

    // Ripple circle
    nodeG.append('circle').attr('class','ripple')
      .attr('r',       d => NODE_RADIUS[d.type]||14)
      .attr('fill',   'none')
      .attr('stroke',  d => getColor(d))
      .attr('stroke-width', 2)
      .attr('opacity', 0);

    // Main circle
    nodeG.append('circle').attr('class','main-circle')
      .attr('r',            d => NODE_RADIUS[d.type]||14)
      .attr('fill',         d => getColor(d)+'22')
      .attr('stroke',       d => getColor(d))
      .attr('stroke-width', 2);

    // Type letter
    nodeG.append('text')
      .attr('text-anchor','middle')
      .attr('dominant-baseline','middle')
      .attr('fill',          d => getColor(d))
      .attr('font-family',  'Orbitron, monospace')
      .attr('font-size',     d => (NODE_RADIUS[d.type]||14)*0.7)
      .attr('font-weight',  'bold')
      .attr('pointer-events','none')
      .text(d => d.type[0].toUpperCase());

    // Device name label
    nodeG.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy',           d => (NODE_RADIUS[d.type]||14)+14)
      .attr('fill',         d => getColor(d))
      .attr('font-family', 'Share Tech Mono, monospace')
      .attr('font-size',    9)
      .attr('pointer-events','none')
      .text(d => d.name);

    // No firewall warning
    nodeG.filter(d => !d.hasFirewall).append('text')
      .attr('text-anchor', 'middle')
      .attr('dy',           d => -(NODE_RADIUS[d.type]||14)-8)
      .attr('fill',        '#f4a261')
      .attr('font-size',    9)
      .attr('font-family', 'Share Tech Mono, monospace')
      .attr('pointer-events','none')
      .text('⚠ NO FW');

    // Tick
    simulationRef.current.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeG.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Store refs for external access
    svgRef.current._nodeG = nodeG;
    svgRef.current._zoom  = zoom;
    svgRef.current._svg   = svg;

    return () => { simulationRef.current?.stop(); };
  }, [nodes.length, edges.length]);

  // ── Update colors when node status changes ────────
  useEffect(() => {
    const nodeG = svgRef.current?._nodeG;
    if (!nodeG) return;

    nodeG.each(function(d) {
      const updated = nodes.find(n => n && n._id && n._id === d.id);
      if (!updated) return;

      d.status      = updated.status;
      d.hasFirewall = updated.hasFirewall;

      const color = getColor(updated);

      d3.select(this).select('.main-circle')
        .transition().duration(600)
        .attr('stroke', color)
        .attr('fill',   color + '22');

      // Ripple pulse on compromised nodes
      if (updated.status === 'compromised') {
        const el = d3.select(this);
        if (el.attr('data-pulsing')) return;
        el.attr('data-pulsing', '1');

        const ripple = el.select('.ripple')
          .attr('stroke', '#ff2244')
          .attr('stroke-width', 2);

        function pulse() {
          ripple
            .attr('r',       NODE_RADIUS[d.type] || 14)
            .attr('opacity', 0.9)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicOut)
            .attr('r',       (NODE_RADIUS[d.type] || 14) * 4)
            .attr('opacity', 0)
            .on('end', pulse);
        }
        pulse();
      }
    });
  }, [nodes]);

  // ── D3Graph JSX — zoom buttons INSIDE here ────────
  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <svg
        ref={svgRef}
        style={{ width:'100%', height:'100%', display:'block' }}
      />

      {/* Zoom Controls — svgRef is accessible here ✅ */}
      <div style={{
        position:'absolute', bottom:70, right:16,
        display:'flex', flexDirection:'column', gap:4, zIndex:20,
      }}>
        <button
          onClick={() => {
            const svg  = d3.select(svgRef.current);
            const zoom = svgRef.current?._zoom;
            if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 1.4);
          }}
          style={zoomBtnStyle}
          title="Zoom In"
        >+</button>

        <button
          onClick={() => {
            const svg  = d3.select(svgRef.current);
            const zoom = svgRef.current?._zoom;
            if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 0.7);
          }}
          style={zoomBtnStyle}
          title="Zoom Out"
        >−</button>

        <button
          onClick={() => {
            const svg  = d3.select(svgRef.current);
            const zoom = svgRef.current?._zoom;
            if (zoom) svg.transition().duration(500)
              .call(zoom.transform, d3.zoomIdentity);
          }}
          style={zoomBtnStyle}
          title="Reset View"
        >↺</button>
      </div>

      {/* Edge Legend */}
      <div style={{
        position:'absolute', top:16, right:16,
        background:'#060f1e', border:'1px solid #0d2444',
        padding:12, borderRadius:4, zIndex:20,
        fontSize:9, fontFamily:'Share Tech Mono',
      }}>
        <div style={{ color:'#00d4ff', marginBottom:8, fontWeight:'bold' }}>
          CONNECTION TYPES
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:20, height:2,
              background:'#52b788', borderRadius:1,
            }}></div>
            <span style={{ color:'#52b788' }}>Encrypted</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:20, height:2,
              background:'#0d2444', borderRadius:1,
              borderStyle:'dashed', borderWidth:'1px 0',
              borderColor:'#0d2444',
            }}></div>
            <span style={{ color:'#4a5568' }}>Unencrypted</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div style={{
        position:'absolute', bottom:16, right:16,
        fontSize:9, fontFamily:'Share Tech Mono',
        color:'#1a3a5c', textAlign:'right', lineHeight:1.6,
        pointerEvents:'none', zIndex:20,
      }}>
        Scroll → Zoom · Drag canvas → Pan · Dbl-click → Reset
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main Graph Page
// ══════════════════════════════════════════════════════
export default function Graph() {
  const { isAdmin }                                = useAuth();
  const { nodes, setNodes, edges, setEdges, loading, error } = useGraph();
  const { emit, on, off }                          = useSocket();

  const [selectedNode, setSelectedNode] = useState(null);
  const [dmOpen,       setDmOpen      ] = useState(false);  // Device Manager panel
  const [logs,         setLogs        ] = useState([
    { type:'safe', msg:'System initialised',      time: ts() },
    { type:'safe', msg:'Network topology loaded', time: ts() },
    { type:'safe', msg:'All systems nominal',     time: ts() },
  ]);

  function ts() { return new Date().toTimeString().slice(0,8); }

  function addLog(type, msg) {
    setLogs(prev => [...prev, { type, msg, time: ts() }]);
  }

  // ── Socket listeners ──────────────────────────────
  useEffect(() => {
    function onWave({ compromised, blocked }) {
      setNodes(prev => prev.map(n =>
        compromised.includes(n._id) ? { ...n, status:'compromised' } : n
      ));
      if (compromised.length) addLog('danger', `${compromised.length} node(s) compromised`);
      if (blocked.length)     addLog('warn',   `${blocked.length} node(s) blocked by firewall`);
    }

    function onSpread({ compromised }) {
      if (!compromised?.length) return;
      setNodes(prev => prev.map(n =>
        compromised.includes(n._id) ? { ...n, status:'compromised' } : n
      ));
    }

    function onComplete({ message }) {
      addLog('warn', message);
    }

    function onReset({ nodes: fresh }) {
      setNodes([...fresh]);
      setSelectedNode(null);
      addLog('safe', 'Network reset — all systems nominal');
    }

    function onNodeAdded({ node }) {
      setNodes(prev => [...prev, node]);
      addLog('safe', `Node added: ${node.name}`);
    }

    function onNodeUpdated({ node }) {
      setNodes(prev => prev.map(n => n._id === node._id ? node : n));
    }

    function onAuthError({ message }) {
      addLog('danger', `⛔ ${message}`);
    }

    on('attack:wave',     onWave);
    on('attack:spread',   onSpread);
    on('attack:complete', onComplete);
    on('reset:done',      onReset);
    on('node:added',      onNodeAdded);
    on('node:updated',    onNodeUpdated);
    on('auth:error',      onAuthError);

    return () => {
      off('attack:wave',     onWave);
      off('attack:spread',   onSpread);
      off('attack:complete', onComplete);
      off('reset:done',      onReset);
      off('node:added',      onNodeAdded);
      off('node:updated',    onNodeUpdated);
      off('auth:error',      onAuthError);
    };
  }, [on, off]);

  // Auto-scroll attack log
  useEffect(() => {
    const el = document.getElementById('attack-log');
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // ── Actions ───────────────────────────────────────
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
    addLog('danger', `⚡ Attack launched on ${selectedNode.name}`);
  }

  function resetNetwork() {
    emit('reset:network');
    addLog('safe', 'Reset requested...');
  }

  function addNode() {
    const types = ['server','workstation','iot'];
    emit('node:add', {
      name:       `NODE-${Date.now().toString().slice(-4)}`,
      type:        types[Math.floor(Math.random()*types.length)],
      ip:         `192.168.${Math.floor(Math.random()*5)+1}.${Math.floor(Math.random()*200)+10}`,
      os:         'Unknown',
      hasFirewall: false,
      status:     'warning',
      position:   { x:400+Math.random()*200, y:300+Math.random()*200 },
    });
  }

  async function deleteNode() {
    if (!selectedNode) {
      addLog('warn', 'Select a node first!');
      return;
    }
    try {
      await api.delete(`/api/nodes/${selectedNode._id}`);
      setNodes(prev => prev.filter(n => n._id !== selectedNode._id));
      addLog('safe', `Node ${selectedNode.name} deleted`);
      setSelectedNode(null);
    } catch (err) {
      addLog('danger', 'Delete failed: ' + err.message);
    }
  }

  // ── Refresh nodes after DeviceManager changes ─────
  async function handleNodesChanged() {
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        api.get('/api/nodes'),
        api.get('/api/edges'),
      ]);
      setNodes(nodesRes.data.data.filter(n => n && n._id));
      setEdges(edgesRes.data.data.filter(e => e && e.source && e.target));
      setSelectedNode(null);
    } catch (err) {
      console.error('Refresh failed:', err.message);
    }
  }

  // ── Loading / Error states ────────────────────────
  if (loading) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'calc(100vh - 56px)', color:'#00d4ff',
      fontFamily:'Share Tech Mono', fontSize:13,
    }}>
      Loading network topology...
    </div>
  );

  if (error) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'calc(100vh - 56px)', color:'#ff2244',
      fontFamily:'Share Tech Mono', fontSize:13,
    }}>
      ❌ {error} — Backend chal raha hai?
    </div>
  );

  // ── Render ────────────────────────────────────────
  return (
    <div style={{ display:'flex', width:'100%', height:'calc(100vh - 56px)' }}>

      {/* ── Left: Graph Canvas ──────────────────────── */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

        {/* D3Graph — zoom/pan + zoom buttons inside */}
        <D3Graph
          nodes={nodes}
          edges={edges}
          onNodeClick={setSelectedNode}
        />

        {/* Legend — top left */}
        <div style={{
          position:'absolute', top:16, left:16,
          background:'#060f1edd', border:'1px solid #0d2444',
          padding:12, fontSize:11, zIndex:10,
          pointerEvents:'none',
        }}>
          <div style={{
            color:'#00d4ff', fontFamily:'Rajdhani', fontWeight:700,
            letterSpacing:2, marginBottom:8,
          }}>LEGEND</div>
          {Object.entries(NODE_TYPES).map(([key, label]) => (
            <div key={key} style={{
              display:'flex', alignItems:'center', gap:8, marginBottom:4,
            }}>
              <div style={{
                width:10, height:10, borderRadius:'50%',
                background: NODE_COLORS[key],
              }} />
              <span style={{ color:'#8ab4d4', fontSize:10 }}>{label}</span>
            </div>
          ))}
          <div style={{
            borderTop:'1px solid #0d2444', marginTop:8,
            paddingTop:6, color:'#1a3a5c', fontSize:9,
          }}>
            Click node → Select
          </div>
        </div>

        {/* Action buttons — bottom center */}
        <div style={{
          position:'absolute', bottom:16,
          left:'50%', transform:'translateX(-50%)',
          display:'flex', gap:8, zIndex:10, flexWrap:'wrap',
          justifyContent:'center',
        }}>
          <button onClick={resetNetwork} style={btn('#00d4ff')}>
            ↺ RESET
          </button>

          <button onClick={() => setDmOpen(true)} style={btn('#aa44ff')}>
            ⚙ DEVICES
          </button>

          <button
            onClick={simulateAttack}
            disabled={!isAdmin}
            title={!isAdmin ? 'Admin access required' : ''}
            style={{
              ...btn('#ff2244'),
              opacity: isAdmin ? 1 : 0.4,
              cursor:  isAdmin ? 'pointer' : 'not-allowed',
            }}
          >
            ⚡ SIMULATE ATTACK {!isAdmin && '(ADMIN ONLY)'}
          </button>
        </div>
      </div>

      {/* ── Right: Info + Log Panel ─────────────────── */}
      <div style={{
        width:280, borderLeft:'1px solid #0d2444',
        background:'#060f1e', display:'flex',
        flexDirection:'column', overflow:'hidden', flexShrink:0,
      }}>

        {/* Node details */}
        <div style={{ padding:14, borderBottom:'1px solid #0d2444', flexShrink:0 }}>
          <div style={titleSt}>NODE DETAILS</div>

          {selectedNode ? (
            <>
              <div style={{
                fontFamily:'Orbitron', fontSize:12,
                color:'#c8e4f8', marginBottom:10,
                wordBreak:'break-all',
              }}>
                {selectedNode.name}
              </div>

              {[
                ['TYPE',        NODE_TYPES[selectedNode.type] || selectedNode.type],
                ['IP',          selectedNode.ip],
                ['OS',          selectedNode.os],
                ['FIREWALL',    selectedNode.hasFirewall ? 'ENABLED' : 'DISABLED'],
                ['CONNECTIONS', edges.filter(e => {
                  const src = typeof e.source==='object' ? e.source._id : e.source;
                  const tgt = typeof e.target==='object' ? e.target._id : e.target;
                  return src === selectedNode._id || tgt === selectedNode._id;
                }).length],
                ['STATUS',      selectedNode.status.toUpperCase()],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display:'flex', justifyContent:'space-between',
                  fontSize:10, padding:'3px 0',
                  borderBottom:'1px solid #0d244466',
                  gap:6,
                }}>
                  <span style={{ color:'#4a5568', flexShrink:0 }}>{label}</span>
                  <span style={{
                    fontWeight:'bold', textAlign:'right',
                    color: label==='STATUS'
                      ? selectedNode.status==='secure'      ? '#52b788'
                      : selectedNode.status==='compromised' ? '#ff2244' : '#f4a261'
                      : label==='FIREWALL'
                      ? selectedNode.hasFirewall ? '#52b788' : '#ff2244'
                      : '#c8e4f8',
                  }}>{val}</span>
                </div>
              ))}

              {/* Delete button — admin only */}
              {isAdmin && (
                <button
                  onClick={deleteNode}
                  style={{
                    marginTop:10, width:'100%', padding:'5px',
                    fontFamily:'Rajdhani', fontWeight:700,
                    fontSize:10, letterSpacing:2,
                    border:'1px solid #ff2244', background:'#ff224411',
                    color:'#ff2244', cursor:'pointer', textTransform:'uppercase',
                  }}
                >
                  🗑 DELETE NODE
                </button>
              )}
            </>
          ) : (
            <div style={{ fontSize:11, color:'#4a5568', fontFamily:'Share Tech Mono' }}>
              Click a node to inspect
            </div>
          )}
        </div>

        {/* Log header */}
        <div style={{
          padding:'10px 14px 6px',
          borderBottom:'1px solid #0d2444',
          flexShrink:0,
        }}>
          <div style={titleSt}>ATTACK LOG</div>
        </div>

        {/* Log entries */}
        <div
          id="attack-log"
          style={{ flex:1, overflowY:'auto', padding:14 }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{
              fontSize:10, padding:'3px 0',
              borderBottom:'1px solid #0d244455',
              display:'flex', gap:8,
            }}>
              <span style={{ color:'#1a3a5c', flexShrink:0 }}>
                {log.time}
              </span>
              <span style={{
                color: log.type==='safe'   ? '#52b788'
                     : log.type==='danger' ? '#ff2244'
                     :                       '#f4a261',
              }}>
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Device Manager Panel ─────────────────────── */}
      <DeviceManager
        isOpen={dmOpen}
        onClose={() => setDmOpen(false)}
        onNodesChanged={handleNodesChanged}
      />
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────
function btn(color) {
  return {
    fontFamily:    'Rajdhani',
    fontWeight:    700,
    letterSpacing: 2,
    fontSize:      11,
    padding:       '6px 18px',
    border:        `1px solid ${color}`,
    background:    color + '22',
    color,
    cursor:        'pointer',
    textTransform: 'uppercase',
    whiteSpace:    'nowrap',
  };
}

const titleSt = {
  fontFamily:    'Rajdhani',
  fontWeight:    700,
  fontSize:      10,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color:         '#00d4ff',
  marginBottom:  10,
};