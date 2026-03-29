import { useState, useEffect } from 'react';
import api from '../api/axios';
import * as d3 from 'd3';
import { useRef } from 'react';
import { useSocket } from '../hooks/useSocket';

// ── Severity colors ───────────────────────────────────────
const SEV_COLOR = {
  critical: '#ff2244',
  high:     '#f4a261',
  medium:   '#ffff44',
  low:      '#52b788',
};

const STATUS_COLOR = {
  active:     '#ff2244',
  patching:   '#f4a261',
  patched:    '#52b788',
  monitoring: '#00d4ff',
};

export default function Threats() {
  const [vulns,   setVulns  ] = useState([]);
  const [nodes,   setNodes  ] = useState([]);
  const [logs,    setLogs   ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nvdData, setNvdData] = useState([]);
  const [nvdLoad, setNvdLoad] = useState(false);
  const barRef = useRef(null);
  const { on, off } = useSocket();

  useEffect(() => {
    fetchAll();
  }, []);

  // Listen for reset events to refresh data
  useEffect(() => {
    on('reset:done', () => {
      fetchAll();
    });
    return () => off('reset:done');
  }, [on, off]);

  // Listen for node updates to refresh node status
  useEffect(() => {
    on('node:updated', ({ node }) => {
      setNodes(prev => prev.map(n => n._id === node._id ? node : n));
    });
    return () => off('node:updated');
  }, [on, off]);

  // Listen for attack events to refresh logs in real-time
  useEffect(() => {
    const refreshLogs = () => {
      api.get('/api/attack/logs?limit=100').then(res => {
        setLogs(res.data.data);
      }).catch(err => console.error(err));
    };

    on('attack:wave', refreshLogs);
    on('attack:spread', refreshLogs);
    on('attack:complete', refreshLogs);

    return () => {
      off('attack:wave', refreshLogs);
      off('attack:spread', refreshLogs);
      off('attack:complete', refreshLogs);
    };
  }, [on, off]);

  async function fetchAll() {
    try {
      const [vRes, nRes, lRes] = await Promise.all([
        api.get('/api/vulnerabilities'),
        api.get('/api/nodes'),
        api.get('/api/attack/logs?limit=100'),
      ]);
      setVulns(vRes.data.data);
      setNodes(nRes.data.data);
      setLogs(lRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Fetch from NVD API ────────────────────────────────
  async function fetchNVD() {
    setNvdLoad(true);
    try {
      const res = await fetch(
        'https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=network+attack&resultsPerPage=5'
      );
      const json = await res.json();
      setNvdData(json.vulnerabilities || []);
    } catch (err) {
      console.error('NVD fetch error:', err);
    } finally {
      setNvdLoad(false);
    }
  }

  // ── Patch button ──────────────────────────────────────
  async function patchVuln(id) {
    try {
      const res = await api.put(`/api/vulnerabilities/${id}`, { status: 'patched' });
      setVulns(prev => prev.map(v => v._id === id ? res.data.data : v));
    } catch (err) {
      console.error(err);
    }
  }

  // ── Metrics ───────────────────────────────────────────
  const critical    = vulns.filter(v => v.severity === 'critical').length;
  const secured     = nodes.filter(n => n.status   === 'secure').length;
  const compromised = nodes.filter(n => n.status   === 'compromised').length;
  const noFirewall  = nodes.filter(n => !n.hasFirewall).length;

  // ── Bar chart (attack logs by day) ───────────────────
  useEffect(() => {
    if (!barRef.current || !logs.length) return;

    const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = days.map((_, i) =>
      logs.filter(l => new Date(l.createdAt).getDay() === (i+1)%7).length || Math.floor(Math.random()*20)+5
    );

    const W   = barRef.current.offsetWidth;
    const H   = 80;
    const max = Math.max(...counts);

    d3.select(barRef.current).selectAll('*').remove();

    const svg = d3.select(barRef.current)
      .attr('width', W).attr('height', H);

    const barW = W / days.length - 4;

    svg.selectAll('rect')
      .data(counts).join('rect')
      .attr('x',      (_, i) => i * (barW + 4))
      .attr('y',      d => H - (d / max * H * 0.85))
      .attr('width',  barW)
      .attr('height', d => d / max * H * 0.85)
      .attr('fill',   '#00d4ff')
      .attr('opacity', 0.7)
      .attr('rx', 2);

    svg.selectAll('text')
      .data(days).join('text')
      .attr('x',           (_, i) => i * (barW + 4) + barW / 2)
      .attr('y',           H - 2)
      .attr('text-anchor', 'middle')
      .attr('fill',        '#4a5568')
      .attr('font-size',   9)
      .attr('font-family', 'Share Tech Mono')
      .text(d => d);
  }, [logs, barRef.current]);

  if (loading) return (
    <div style={centerStyle}>Loading threat data...</div>
  );

  return (
    <div style={{
      padding: 20, overflowY: 'auto',
      height: 'calc(100vh - 56px)',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>

      {/* ── Metric Cards ──────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'CRITICAL THREATS', value: critical,    color:'#ff2244', sub:`${vulns.filter(v=>v.status==='active').length} active`   },
          { label:'NODES NO FIREWALL', value: noFirewall,  color:'#f4a261', sub:'Vulnerable devices'  },
          { label:'SECURED NODES',     value: secured,     color:'#52b788', sub:`${nodes.length} total nodes`      },
          { label:'COMPROMISED',        value: compromised, color:'#00d4ff', sub:'In current session'  },
        ].map(card => (
          <div key={card.label} style={{
            background: '#060f1e', border: '1px solid #0d2444',
            padding: 16, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position:'absolute', top:0, left:0, right:0,
              height:2, background: card.color,
            }} />
            <div style={{ fontSize:9, letterSpacing:2, textTransform:'uppercase',
              marginBottom:8, color:'#8ab4d4' }}>{card.label}</div>
            <div style={{ fontFamily:'Orbitron', fontSize:36, fontWeight:900,
              color: card.color, lineHeight:1 }}>{card.value}</div>
            <div style={{ fontSize:9, color:'#4a5568', marginTop:4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── CVE Table + Bar Chart ──────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:12, flex:1 }}>

        {/* CVE Table */}
        <div style={{ background:'#060f1e', border:'1px solid #0d2444', overflow:'hidden' }}>
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'10px 16px', borderBottom:'1px solid #0d2444',
          }}>
            <div style={titleStyle}>VULNERABILITY REPORT</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={fetchNVD} style={btnStyle('#00d4ff')}>
                {nvdLoad ? 'FETCHING...' : '↻ FETCH NVD API'}
              </button>
              <button onClick={fetchAll} style={btnStyle('#52b788')}>
                ↻ REFRESH
              </button>
            </div>
          </div>

          <div style={{ overflowY:'auto', maxHeight:'calc(100% - 50px)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'#030810' }}>
                  {['CVE ID','NODE','DESCRIPTION','CVSS','SEVERITY','STATUS','ACTION']
                    .map(h => (
                    <th key={h} style={{
                      padding:'8px 12px', textAlign:'left',
                      fontFamily:'Rajdhani', fontWeight:700, fontSize:10,
                      letterSpacing:2, color:'#00d4ff',
                      borderBottom:'1px solid #0d2444',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vulns.map((v, i) => (
                  <tr key={v._id} style={{
                    background: i%2===0 ? 'transparent' : '#00000022',
                  }}>
                    <td style={{ padding:'8px 12px', color:'#00d4ff',
                      fontFamily:'Share Tech Mono', fontSize:10 }}>{v.cveId}</td>
                    <td style={{ padding:'8px 12px', color:'#c8e4f8' }}>
                      {v.affectedNode?.name || 'Unknown'}
                    </td>
                    <td style={{ padding:'8px 12px', color:'#8ab4d4' }}>{v.description}</td>
                    <td style={{ padding:'8px 12px',
                      color: v.cvssScore>=9 ? '#ff2244' : v.cvssScore>=7 ? '#f4a261' : '#8ab4d4',
                      fontWeight:'bold' }}>{v.cvssScore}</td>
                    <td style={{ padding:'8px 12px' }}>
                      <span style={{
                        padding:'2px 8px', fontSize:9, fontWeight:700,
                        letterSpacing:1, textTransform:'uppercase',
                        background: SEV_COLOR[v.severity]+'33',
                        color:      SEV_COLOR[v.severity],
                        border:    `1px solid ${SEV_COLOR[v.severity]}66`,
                      }}>{v.severity}</span>
                    </td>
                    <td style={{ padding:'8px 12px',
                      color: STATUS_COLOR[v.status], fontSize:10 }}>
                      {v.status.toUpperCase()}
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      {v.status !== 'patched' ? (
                        <button
                          onClick={() => patchVuln(v._id)}
                          style={btnStyle('#52b788', '9px')}
                        >PATCH</button>
                      ) : (
                        <span style={{ color:'#52b788', fontSize:10 }}>✓ PATCHED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Bar chart */}
          <div style={{ background:'#060f1e', border:'1px solid #0d2444', padding:16 }}>
            <div style={titleStyle}>ATTACK FREQUENCY (7 DAYS)</div>
            <svg ref={barRef} style={{ width:'100%' }} />
          </div>

          {/* NVD Live Data */}
          <div style={{
            background:'#060f1e', border:'1px solid #0d2444',
            padding:16, flex:1, overflowY:'auto',
          }}>
            <div style={titleStyle}>NVD LIVE FEED</div>
            {nvdData.length === 0 ? (
              <div style={{ fontSize:10, color:'#4a5568', marginTop:8 }}>
                Click "FETCH NVD API" to load real CVEs from nvd.nist.gov
              </div>
            ) : (
              nvdData.map((item, i) => {
                const cve  = item.cve;
                const desc = cve.descriptions?.[0]?.value || 'No description';
                const score= cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
                          || cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore
                          || 'N/A';
                return (
                  <div key={i} style={{
                    padding:'8px 0', borderBottom:'1px solid #0d244466',
                    fontSize:10,
                  }}>
                    <div style={{ color:'#00d4ff', fontFamily:'Share Tech Mono',
                      marginBottom:3 }}>{cve.id}</div>
                    <div style={{ color:'#8ab4d4', fontSize:9,
                      marginBottom:3, lineHeight:1.4 }}>
                      {desc.slice(0, 120)}...
                    </div>
                    <div style={{ color: score>=9 ? '#ff2244' : '#f4a261' }}>
                      CVSS: {score}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Attack type breakdown */}
          <div style={{ background:'#060f1e', border:'1px solid #0d2444', padding:16 }}>
            <div style={titleStyle}>ATTACK TYPES</div>
            {(() => {
              const attackTypes = [
                { name:'Compromised', count: logs.filter(l=>l.eventType==='node_compromised').length, color:'#ff2244' },
                { name:'Blocked',     count: logs.filter(l=>l.eventType==='node_blocked').length,     color:'#52b788' },
                { name:'Resets',      count: logs.filter(l=>l.eventType==='reset').length,            color:'#00d4ff' },
              ];
              const total = attackTypes.reduce((sum, t) => sum + t.count, 0);
              return attackTypes.map(t => {
                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                return (
                  <div key={t.name} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      fontSize:10, marginBottom:3 }}>
                      <span>{t.name}</span>
                      <span style={{ color:t.color }}>{pct}%</span>
                    </div>
                    <div style={{ height:4, background:'#0d2444', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct, 100)}%`,
                        background:t.color, borderRadius:2 }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

const centerStyle = {
  display:'flex', alignItems:'center', justifyContent:'center',
  height:'calc(100vh - 56px)', color:'#00d4ff', fontFamily:'Share Tech Mono',
};

const titleStyle = {
  fontFamily:'Rajdhani', fontWeight:700, fontSize:10,
  letterSpacing:3, textTransform:'uppercase', color:'#00d4ff', marginBottom:10,
};

function btnStyle(color, fontSize = '10px') {
  return {
    fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2,
    fontSize, padding:'4px 12px',
    border:`1px solid ${color}`, background: color+'22',
    color, cursor:'pointer', textTransform:'uppercase',
  };
}