import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth }             from './context/AuthContext';
import { useSocket }           from './hooks/useSocket';
import ProtectedRoute          from './components/shared/ProtectedRoute';
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
  return <span style={{ color:'#1a3a5c' }}>SYS TIME: {time}</span>;
}

function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { connected }             = useSocket();
  const [menuOpen, setMenuOpen]   = useState(false);
  const location = useLocation();

  const navLinks = [
    { to:'/',         label:'⬡ Network Graph'    },
    { to:'/threats',  label:'⚠ Threat Dashboard' },
    { to:'/firewall', label:'🛡 Firewall Analyzer'},
  ];

  const navStyle = (path) => ({
    padding:       '8px 14px',
    fontFamily:    'Rajdhani, sans-serif',
    fontWeight:    700,
    fontSize:      11,
    letterSpacing: 2,
    border:        `1px solid ${location.pathname === path ? '#00d4ff' : '#0d2444'}`,
    background:    location.pathname === path ? '#00d4ff22' : 'transparent',
    color:         location.pathname === path ? '#00d4ff'   : '#8ab4d4',
    cursor:        'pointer',
    textTransform: 'uppercase',
    textDecoration:'none',
    display:       'block',
    transition:    'all 0.2s',
    whiteSpace:    'nowrap',
  });

  return (
    <>
      <header style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 16px',
        height:         56,
        borderBottom:   '1px solid #0d2444',
        background:     '#060f1e',
        flexShrink:     0,
        position:       'relative',
        zIndex:         100,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily:   'Orbitron, sans-serif',
          fontSize:     16,
          color:        '#00d4ff',
          letterSpacing:4,
          textShadow:   '0 0 12px #00d4ff55',
          flexShrink:   0,
        }}>
          CY<span style={{ color:'#ff2244' }}>-</span>GRAPH
        </div>

        {/* Desktop Nav — hidden on small screens */}
        <nav style={{
          display:    'flex',
          gap:        4,
          flex:       1,
          justifyContent: 'center',
          overflow:   'hidden',
        }}
          className="desktop-nav"
        >
          {navLinks.map(link => (
            <NavLink key={link.to} to={link.to}
              style={({ isActive }) => ({
                ...navStyle(link.to),
                border: `1px solid ${isActive ? '#00d4ff' : '#0d2444'}`,
                background: isActive ? '#00d4ff22' : 'transparent',
                color:      isActive ? '#00d4ff'   : '#8ab4d4',
              })}
            >{link.label}</NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          {/* Connection dot */}
          <div style={{
            width:8, height:8, borderRadius:'50%',
            background: connected ? '#52b788' : '#ff2244',
            boxShadow:  connected ? '0 0 6px #52b788' : '0 0 6px #ff2244',
          }} />

          {/* User badge — hide on very small */}
          {user && (
            <div className="user-badge" style={{
              display:    'flex',
              alignItems: 'center',
              gap:        6,
              padding:    '3px 8px',
              border:    `1px solid ${isAdmin ? '#ff2244' : '#52b788'}`,
              color:      isAdmin ? '#ff2244' : '#52b788',
              fontSize:   10,
              fontFamily: 'Share Tech Mono',
              whiteSpace: 'nowrap',
            }}>
              {isAdmin ? '👑' : '👁'} {user.username.toUpperCase()}
            </div>
          )}

          {/* Logout */}
          {user && (
            <button onClick={logout} className="logout-btn" style={{
              fontFamily:    'Rajdhani, sans-serif',
              fontWeight:    700,
              letterSpacing: 2,
              fontSize:      10,
              padding:       '3px 10px',
              border:        '1px solid #0d2444',
              background:    'transparent',
              color:         '#4a5568',
              cursor:        'pointer',
              textTransform: 'uppercase',
              whiteSpace:    'nowrap',
            }}
              onMouseEnter={e => { e.target.style.borderColor='#ff2244'; e.target.style.color='#ff2244'; }}
              onMouseLeave={e => { e.target.style.borderColor='#0d2444'; e.target.style.color='#4a5568'; }}
            >LOGOUT</button>
          )}

          {/* Hamburger — only on small screens */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hamburger"
            style={{
              display:    'none', // CSS override karega
              background: 'transparent',
              border:     '1px solid #0d2444',
              color:      '#00d4ff',
              padding:    '4px 8px',
              cursor:     'pointer',
              fontSize:   16,
              lineHeight: 1,
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div style={{
          position:   'absolute',
          top:        56,
          left:       0,
          right:      0,
          background: '#060f1e',
          border:     '1px solid #0d2444',
          borderTop:  'none',
          zIndex:     999,
          display:    'flex',
          flexDirection: 'column',
        }}>
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding:        '14px 20px',
                fontFamily:     'Rajdhani, sans-serif',
                fontWeight:     700,
                fontSize:       13,
                letterSpacing:  2,
                textTransform:  'uppercase',
                textDecoration: 'none',
                color:          isActive ? '#00d4ff' : '#8ab4d4',
                background:     isActive ? '#00d4ff11' : 'transparent',
                borderBottom:   '1px solid #0d2444',
                display:        'block',
              })}
            >{link.label}</NavLink>
          ))}

          {/* Mobile user info */}
          <div style={{
            padding:    '12px 20px',
            fontSize:   10,
            fontFamily: 'Share Tech Mono',
            color:      '#4a5568',
            display:    'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: isAdmin ? '#ff2244' : '#52b788' }}>
              {isAdmin ? '👑' : '👁'} {user?.username?.toUpperCase()} · {user?.role?.toUpperCase()}
            </span>
            <button onClick={() => { logout(); setMenuOpen(false); }} style={{
              fontFamily:    'Rajdhani',
              fontWeight:    700,
              fontSize:      10,
              padding:       '4px 12px',
              border:        '1px solid #ff2244',
              background:    '#ff224411',
              color:         '#ff2244',
              cursor:        'pointer',
              letterSpacing: 2,
            }}>LOGOUT</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const { user, isAdmin } = useAuth();
  const { connected }   = useSocket();

  return (
    <BrowserRouter>
      <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
        {user && <Header />}

        <main style={{ flex:1, overflow:'hidden' }}>
          <Routes>
            <Route path="/login" element={
              user ? <Navigate to="/" replace /> : <Login />
            } />
            <Route path="/" element={
              <ProtectedRoute><Graph /></ProtectedRoute>
            } />
            <Route path="/threats" element={
              <ProtectedRoute><Threats /></ProtectedRoute>
            } />
            <Route path="/firewall" element={
              <ProtectedRoute><Firewall /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Connection indicator */}
        {user && (
          <div style={{
            position:'fixed', bottom:12, right:12,
            fontSize:10, fontFamily:'Share Tech Mono',
            color: connected ? '#52b788' : '#ff2244',
            background:'#060f1e', border:'1px solid #0d2444',
            padding:'3px 8px', zIndex:9999,
          }}>
            {connected ? '🟢 LIVE' : '🔴 OFFLINE'}
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}