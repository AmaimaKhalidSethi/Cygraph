import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useState, useEffect }                    from 'react';
import Graph    from './pages/Graph';
import Threats  from './pages/Threats';
import Firewall from './pages/Firewall';
import Login    from './pages/Login';

function Clock() {
  const [time, setTime] = useState(new Date().toTimeString().slice(0,8));
  useEffect(() => {
    const t = setInterval(() =>
      setTime(new Date().toTimeString().slice(0,8)), 1000);
    return () => clearInterval(t);
  }, []);
  return <span style={{ color: '#1a3a5c' }}>SYS TIME: {time}</span>;
}

export default function App() {
  const navStyle = ({ isActive }) => ({
    padding:       '4px 14px',
    fontFamily:    'Rajdhani, sans-serif',
    fontWeight:    700,
    fontSize:      11,
    letterSpacing: 2,
    border:        `1px solid ${isActive ? '#00d4ff' : '#0d2444'}`,
    background:    isActive ? '#00d4ff22' : 'transparent',
    color:         isActive ? '#00d4ff'   : '#8ab4d4',
    cursor:        'pointer',
    textTransform: 'uppercase',
    textDecoration:'none',
    transition:    'all 0.2s',
  });

  return (
    <BrowserRouter>
      <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>

        {/* ── Header ──────────────────────────────────── */}
        <header style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 24px',
          height:         56,
          borderBottom:   '1px solid #0d2444',
          background:     '#060f1e',
          flexShrink:     0,
        }}>
          {/* Logo */}
          <div style={{
            fontFamily:   'Orbitron, sans-serif',
            fontSize:     18,
            color:        '#00d4ff',
            letterSpacing:4,
            textShadow:   '0 0 12px #00d4ff55',
          }}>
            CY<span style={{ color:'#ff2244' }}>-</span>GRAPH
          </div>

          {/* Nav tabs */}
          <nav style={{ display:'flex', gap:4 }}>
            <NavLink to="/"         style={navStyle}>⬡ Network Graph</NavLink>
            <NavLink to="/threats"  style={navStyle}>⚠ Threat Dashboard</NavLink>
            <NavLink to="/firewall" style={navStyle}>🛡 Firewall Analyzer</NavLink>
          </nav>

          {/* Status + clock */}
          <div style={{ display:'flex', gap:16, alignItems:'center',
            fontSize:10, fontFamily:'Share Tech Mono, monospace' }}>
            <StatusPill color="#52b788" label="SECURE"      id="pill-secure" />
            <StatusPill color="#f4a261" label="WARN"        id="pill-warn"   />
            <StatusPill color="#ff2244" label="COMPROMISED" id="pill-danger" />
            <Clock />
          </div>
        </header>

        {/* ── Pages ───────────────────────────────────── */}
        <main style={{ flex:1, overflow:'hidden' }}>
          <Routes>
            <Route path="/"         element={<Graph    />} />
            <Route path="/threats"  element={<Threats  />} />
            <Route path="/firewall" element={<Firewall />} />
            <Route path="/login"    element={<Login    />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function StatusPill({ color, label, id }) {
  return (
    <div id={id} style={{
      padding:    '3px 10px',
      border:     `1px solid ${color}`,
      display:    'flex',
      alignItems: 'center',
      gap:        6,
      color,
    }}>
      <div style={{
        width:12, height:12, borderRadius:'50%',
        background: color,
        animation:  'blink 1.5s infinite',
      }} />
      {label}
    </div>
  );
}