import { useState, useEffect, useRef } from 'react';
import * as d3        from 'd3';
import api            from '../api/axios';
import { useSocket }  from '../hooks/useSocket';

export default function Firewall() {
  const [nodes,      setNodes     ] = useState([]);
  const [rules,      setRules     ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [showForm,   setShowForm  ] = useState(false);
  const [scanIP,     setScanIP    ] = useState('');
  const [scanLines,  setScanLines ] = useState([{ text:'CY-GRAPH Port Scanner v2.4.1', type:'info' }]);
  const [progress,   setProgress  ] = useState(0);
  const [scanning,   setScanning  ] = useState(false);
  const ringRef = useRef(null);
  const { on, off, emit } = useSocket();

  const [newRule, setNewRule] = useState({
    name:'', source:'ANY', destination:'ANY',
    port:'', protocol:'TCP', action:'DENY',
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const [nRes, rRes] = await Promise.all([
        api.get('/api/nodes'),
        api.get('/api/firewall/rules'),
      ]);
      setNodes(nRes.data.data);
      setRules(rRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Socket: listen for node firewall updates ──────────
  useEffect(() => {
    on('node:updated', ({ node }) => {
      setNodes(prev => prev.map(n => n._id === node._id ? node : n));
    });
    return () => off('node:updated');
  }, [on, off]);

  // ── Socket: listen for scan results ──────────────────
  useEffect(() => {
    on('scan:result', ({ port, service, state, dangerous, progress: prog }) => {
      setScanLines(prev => [...prev, { port, service, state, dangerous }]);
      setProgress(prog);
    });

    on('scan:complete', ({ total }) => {
      setScanLines(prev => [...prev,
        { text: `Scan complete — ${total} ports scanned`, type: 'success' }
      ]);
      setScanning(false);
      setProgress(100);
    });

    return () => { off('scan:result'); off('scan:complete'); };
  }, [on, off]);

  // ── Toggle node firewall ──────────────────────────────
  async function toggleFirewall(node) {
    try {
      const updated = { hasFirewall: !node.hasFirewall };
      await api.put(`/api/nodes/${node._id}`, updated);
      // Also broadcast via socket
      emit('node:firewall', { nodeId: node._id, hasFirewall: !node.hasFirewall });
    } catch (err) {
      console.error(err);
    }
  }

  // ── Toggle rule ───────────────────────────────────────
  async function toggleRule(rule) {
    try {
      const res = await api.put(`/api/firewall/rules/${rule._id}`,
        { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r._id === rule._id ? res.data.data : r));
    } catch (err) {
      console.error(err);
    }
  }

  // ── Add rule ──────────────────────────────────────────
  async function addRule(e) {
    e.preventDefault();
    try {
      const res = await api.post('/api/firewall/rules', {
        ...newRule, port: parseInt(newRule.port),
      });
      setRules(prev => [...prev, res.data.data]);
      setShowForm(false);
      setNewRule({ name:'', source:'ANY', destination:'ANY',
        port:'', protocol:'TCP', action:'DENY' });
    } catch (err) {
      console.error(err);
    }
  }

  // ── Run scan ──────────────────────────────────────────
  async function runScan() {
    if (!scanIP || scanning) return;
    setScanning(true);
    setProgress(0);
    setScanLines([
      { text: `Scanning ${scanIP}...`, type: 'info' },
      { text: 'Starting CY-GRAPH port scanner', type: 'info' },
    ]);
    try {
      await api.post('/api/scan', { ip: scanIP });
    } catch (err) {
      setScanLines(prev => [...prev, { text: 'Scan failed: ' + err.message, type: 'error' }]);
      setScanning(false);
    }
  }

  // ── Exposure ring ─────────────────────────────────────
  useEffect(() => {
    if (!ringRef.current || !nodes.length) return;
    const noFw    = nodes.filter(n => !n.hasFirewall).length;
    const score   = Math.round((noFw / nodes.length) * 100);
    const R       = 50;
    const circumf = 2 * Math.PI * R;
    const offset  = circumf * (1 - score / 100);
    const color   = score >= 60 ? '#ff2244' : score >= 30 ? '#f4a261' : '#52b788';

    d3.select(ringRef.current).selectAll('*').remove();
    const svg = d3.select(ringRef.current)
      .attr('width', 130).attr('height', 130);

    svg.append('circle').attr('cx',65).attr('cy',65).attr('r',R)
      .attr('fill','none').attr('stroke','#0d2444').attr('stroke-width',10);

    svg.append('circle').attr('cx',65).attr('cy',65).attr('r',R)
      .attr('fill','none').attr('stroke', color).attr('stroke-width',10)
      .attr('stroke-dasharray', circumf)
      .attr('stroke-dashoffset', offset)
      .attr('stroke-linecap','round')
      .attr('transform','rotate(-90 65 65)');

    svg.append('text').attr('x',65).attr('y',60)
      .attr('text-anchor','middle').attr('fill', color)
      .attr('font-family','Orbitron').attr('font-size',22).attr('font-weight',900)
      .text(score);

    svg.append('text').attr('x',65).attr('y',78)
      .attr('text-anchor','middle').attr('fill','#8ab4d4')
      .attr('font-family','Share Tech Mono').attr('font-size',9)
      .text('/100 RISK');
  }, [nodes]);

  if (loading) return (
    <div style={centerStyle}>Loading firewall data...</div>
  );

  const noFwCount = nodes.filter(n => !n.hasFirewall).length;

  return (
    <div style={{
      padding:20, overflowY:'auto',
      height:'calc(100vh - 56px)',
      display:'flex', flexDirection:'column', gap:16,
    }}>

      {/* ── Top Row ───────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 300px', gap:12 }}>

        {/* Device Firewall List */}
        <div style={cardStyle}>
          <div style={titleStyle}>DEVICE FIREWALL STATUS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
            {nodes.map(node => (
              <div key={node._id} style={{
                display:'flex', alignItems:'center',
                justifyContent:'space-between',
                padding:'6px 10px', border:'1px solid #0d2444',
                cursor:'pointer', transition:'all 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#0d2444'}
              >
                <div>
                  <div style={{ fontSize:11, color:'#c8e4f8' }}>{node.name}</div>
                  <div style={{ fontSize:9, color:'#4a5568' }}>{node.ip} · {node.type}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{
                    fontSize:9, padding:'2px 6px', letterSpacing:1,
                    background: node.hasFirewall ? '#52b78822' : '#ff224422',
                    color:      node.hasFirewall ? '#52b788'   : '#ff2244',
                    border:    `1px solid ${node.hasFirewall ? '#52b78844' : '#ff224444'}`,
                  }}>
                    {node.hasFirewall ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {/* Toggle switch */}
                  <div
                    onClick={() => toggleFirewall(node)}
                    style={{
                      width:36, height:18, borderRadius:9, cursor:'pointer',
                      background:    node.hasFirewall ? '#52b78822' : '#ff224422',
                      border:       `1px solid ${node.hasFirewall ? '#52b788' : '#ff2244'}`,
                      position:'relative', transition:'all 0.2s',
                    }}
                  >
                    <div style={{
                      position:'absolute', width:12, height:12,
                      borderRadius:'50%', top:2,
                      left: node.hasFirewall ? 20 : 2,
                      background: node.hasFirewall ? '#52b788' : '#ff2244',
                      transition:'all 0.2s',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Port Scanner */}
        <div style={cardStyle}>
          <div style={titleStyle}>PORT SCANNER</div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input
              value={scanIP}
              onChange={e => setScanIP(e.target.value)}
              placeholder="Target IP e.g. 192.168.1.10"
              style={{
                flex:1, background:'#030810', border:'1px solid #0d2444',
                color:'#c8e4f8', padding:'7px 12px',
                fontFamily:'Share Tech Mono', fontSize:11, outline:'none',
              }}
              onFocus={e  => e.target.style.borderColor = '#00d4ff'}
              onBlur={e   => e.target.style.borderColor = '#0d2444'}
            />
            <button
              onClick={runScan}
              disabled={scanning}
              style={{
                ...btnStyle('#00d4ff'),
                opacity: scanning ? 0.5 : 1,
              }}
            >
              {scanning ? 'SCANNING...' : 'SCAN'}
            </button>
          </div>

          {/* Quick IP buttons */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {nodes.slice(0,6).map(n => (
              <button key={n._id}
                onClick={() => setScanIP(n.ip)}
                style={{ ...btnStyle('#0d2444', '9px'), color:'#8ab4d4' }}
              >{n.ip}</button>
            ))}
          </div>

          {/* Scan output */}
          <div style={{
            background:'#030810', border:'1px solid #0d2444',
            padding:10, height:160, overflowY:'auto',
            fontFamily:'Share Tech Mono', fontSize:10,
          }}>
            {scanLines.map((line, i) => {
              if (line.text) return (
                <div key={i} style={{
                  color: line.type==='success' ? '#52b788'
                       : line.type==='error'   ? '#ff2244' : '#8ab4d4',
                  marginBottom:2,
                }}>{line.text}</div>
              );
              return (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:2 }}>
                  <span style={{ color:'#4a5568', minWidth:40 }}>{line.port}</span>
                  <span style={{
                    color: line.state==='open'
                      ? line.dangerous ? '#ff2244' : '#52b788'
                      : line.state==='filtered' ? '#f4a261' : '#4a5568',
                    minWidth:70,
                  }}>{line.state}</span>
                  <span style={{ color:'#8ab4d4' }}>{line.service}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ height:4, background:'#0d2444', borderRadius:2,
            marginTop:8, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${progress}%`,
              background:'#00d4ff', borderRadius:2,
              transition:'width 0.3s',
              boxShadow:'0 0 8px #00d4ff55',
            }} />
          </div>
          <div style={{ fontSize:9, color:'#4a5568', marginTop:4, textAlign:'right' }}>
            {progress}% complete
          </div>
        </div>

        {/* Exposure Ring */}
        <div style={{ ...cardStyle, alignItems:'center', justifyContent:'center',
          display:'flex', flexDirection:'column' }}>
          <div style={titleStyle}>NETWORK EXPOSURE SCORE</div>
          <svg ref={ringRef} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
            gap:8, marginTop:12, width:'100%' }}>
            {[
              { label:'No Firewall', value: noFwCount,                    color:'#ff2244' },
              { label:'Protected',   value: nodes.length - noFwCount,     color:'#52b788' },
            ].map(m => (
              <div key={m.label} style={{ textAlign:'center', padding:8,
                border:'1px solid #0d2444' }}>
                <div style={{ fontFamily:'Orbitron', fontSize:18,
                  color:m.color }}>{m.value}</div>
                <div style={{ fontSize:9, color:'#4a5568', marginTop:2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Firewall Rules Table ───────────────────────── */}
      <div style={{ background:'#060f1e', border:'1px solid #0d2444', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', padding:'10px 16px', borderBottom:'1px solid #0d2444' }}>
          <div style={titleStyle}>FIREWALL RULES MANAGER</div>
          <button onClick={() => setShowForm(!showForm)} style={btnStyle('#00d4ff')}>
            {showForm ? '✕ CANCEL' : '+ ADD RULE'}
          </button>
        </div>

        {/* Add rule form */}
        {showForm && (
          <form onSubmit={addRule} style={{
            display:'flex', gap:8, padding:'12px 16px',
            borderBottom:'1px solid #0d2444', flexWrap:'wrap',
          }}>
            {[
              { key:'name',        placeholder:'Rule Name',    width:140 },
              { key:'source',      placeholder:'Source',       width:100 },
              { key:'destination', placeholder:'Destination',  width:100 },
              { key:'port',        placeholder:'Port',         width:70, type:'number' },
            ].map(f => (
              <input key={f.key}
                required
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={newRule[f.key]}
                onChange={e => setNewRule(p => ({ ...p, [f.key]: e.target.value }))}
                style={{
                  width: f.width, background:'#030810',
                  border:'1px solid #0d2444', color:'#c8e4f8',
                  padding:'6px 10px', fontFamily:'Share Tech Mono',
                  fontSize:11, outline:'none',
                }}
              />
            ))}
            {[
              { key:'protocol', opts:['TCP','UDP','ICMP','ANY'] },
              { key:'action',   opts:['ALLOW','DENY'] },
            ].map(s => (
              <select key={s.key}
                value={newRule[s.key]}
                onChange={e => setNewRule(p => ({ ...p, [s.key]: e.target.value }))}
                style={{
                  background:'#030810', border:'1px solid #0d2444',
                  color:'#c8e4f8', padding:'6px 10px',
                  fontFamily:'Share Tech Mono', fontSize:11, outline:'none',
                }}
              >
                {s.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <button type="submit" style={btnStyle('#52b788')}>SAVE RULE</button>
          </form>
        )}

        {/* Rules table */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'#030810' }}>
                {['#','RULE NAME','SOURCE','DESTINATION','PORT','PROTOCOL','ACTION','ENABLED']
                  .map(h => (
                  <th key={h} style={{
                    padding:'8px 12px', textAlign:'left',
                    fontFamily:'Rajdhani', fontWeight:700,
                    fontSize:10, letterSpacing:2, color:'#00d4ff',
                    borderBottom:'1px solid #0d2444',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, i) => (
                <tr key={rule._id}
                  style={{ background: i%2===0 ? 'transparent' : '#00000022' }}>
                  <td style={{ padding:'8px 12px', color:'#4a5568' }}>{i+1}</td>
                  <td style={{ padding:'8px 12px', color:'#c8e4f8' }}>{rule.name}</td>
                  <td style={{ padding:'8px 12px', color:'#8ab4d4' }}>{rule.source}</td>
                  <td style={{ padding:'8px 12px', color:'#8ab4d4' }}>{rule.destination}</td>
                  <td style={{ padding:'8px 12px', color:'#00d4ff',
                    fontFamily:'Share Tech Mono' }}>{rule.port}</td>
                  <td style={{ padding:'8px 12px', color:'#8ab4d4' }}>{rule.protocol}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{
                      color:      rule.action==='ALLOW' ? '#52b788' : '#ff2244',
                      fontWeight: 'bold',
                    }}>{rule.action}</span>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <div
                      onClick={() => toggleRule(rule)}
                      style={{
                        width:36, height:18, borderRadius:9, cursor:'pointer',
                        background:  rule.enabled ? '#52b78822' : '#ff224422',
                        border:     `1px solid ${rule.enabled ? '#52b788' : '#ff2244'}`,
                        position:'relative', transition:'all 0.2s',
                      }}
                    >
                      <div style={{
                        position:'absolute', width:12, height:12,
                        borderRadius:'50%', top:2,
                        left: rule.enabled ? 20 : 2,
                        background: rule.enabled ? '#52b788' : '#ff2244',
                        transition:'all 0.2s',
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const centerStyle = {
  display:'flex', alignItems:'center', justifyContent:'center',
  height:'calc(100vh - 56px)', color:'#00d4ff', fontFamily:'Share Tech Mono',
};

const cardStyle = {
  background:'#060f1e', border:'1px solid #0d2444', padding:16,
};

const titleStyle = {
  fontFamily:'Rajdhani', fontWeight:700, fontSize:10,
  letterSpacing:3, textTransform:'uppercase', color:'#00d4ff', marginBottom:10,
};

function btnStyle(color, fontSize = '10px') {
  return {
    fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2,
    fontSize, padding:'5px 14px',
    border:`1px solid ${color}`, background: color+'22',
    color, cursor:'pointer', textTransform:'uppercase',
  };
}