import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InteractiveGrid from '../components/shared/InteractiveGrid';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError   ] = useState('');
  const [loading,  setLoading ] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // Quick fill buttons
  function fillAdmin()  { setUsername('admin');  setPassword('admin123');  }
  function fillViewer() { setUsername('viewer'); setPassword('viewer123'); }

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'#030810',
      fontFamily:'Share Tech Mono, monospace',
    }}>
      {/* Interactive Grid Background */}
      <InteractiveGrid />

      <div style={{
        position:'relative', zIndex:1,
        width:400, background:'#060f1e',
        border:'1px solid #0d2444', padding:40,
        boxShadow:'0 0 50px rgba(0, 212, 255, 0.1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            fontFamily:'Orbitron', fontSize:28, fontWeight:900,
            color:'#00d4ff', letterSpacing:6,
            textShadow:'0 0 20px #00d4ff55',
          }}>
            CY<span style={{ color:'#ff2244' }}>-</span>GRAPH
          </div>
          <div style={{ fontSize:10, color:'#4a5568', marginTop:6, letterSpacing:3 }}>
            ATTACK SURFACE VISUALIZER
          </div>
          <div style={{
            height:1, background:'linear-gradient(to right, transparent, #00d4ff, transparent)',
            marginTop:16,
          }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:9, letterSpacing:3, color:'#8ab4d4',
              display:'block', marginBottom:6 }}>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={inputStyle}
              onFocus={e  => e.target.style.borderColor = '#00d4ff'}
              onBlur={e   => e.target.style.borderColor = '#0d2444'}
            />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:9, letterSpacing:3, color:'#8ab4d4',
              display:'block', marginBottom:6 }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={e  => e.target.style.borderColor = '#00d4ff'}
              onBlur={e   => e.target.style.borderColor = '#0d2444'}
            />
          </div>

          {error && (
            <div style={{
              color:'#ff2244', fontSize:10, marginBottom:16,
              padding:'8px 12px', border:'1px solid #ff224444',
              background:'#ff224411',
            }}>❌ {error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%', padding:'12px',
              fontFamily:'Rajdhani', fontWeight:700,
              letterSpacing:4, fontSize:13,
              background: loading ? '#00d4ff11' : '#00d4ff22',
              border:'1px solid #00d4ff',
              color:'#00d4ff', cursor: loading ? 'not-allowed' : 'pointer',
              textTransform:'uppercase', transition:'all 0.2s',
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>

        {/* Quick fill */}
        <div style={{ marginTop:24, borderTop:'1px solid #0d2444', paddingTop:16 }}>
          <div style={{ fontSize:9, color:'#4a5568', letterSpacing:2,
            marginBottom:8 }}>QUICK LOGIN:</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={fillAdmin} style={{
              flex:1, padding:'6px',
              fontFamily:'Share Tech Mono', fontSize:10,
              background:'#ff224411', border:'1px solid #ff224444',
              color:'#ff2244', cursor:'pointer',
            }}>
              👑 ADMIN
            </button>
            <button onClick={fillViewer} style={{
              flex:1, padding:'6px',
              fontFamily:'Share Tech Mono', fontSize:10,
              background:'#52b78811', border:'1px solid #52b78844',
              color:'#52b788', cursor:'pointer',
            }}>
              👁 VIEWER
            </button>
          </div>
        </div>

        {/* Version */}
        <div style={{ textAlign:'center', marginTop:20,
          fontSize:9, color:'#1a3a5c' }}>
          CY-GRAPH v1.0 · MERN STACK · JWT AUTH
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width:'100%', background:'#030810',
  border:'1px solid #0d2444', color:'#c8e4f8',
  padding:'10px 14px', fontFamily:'Share Tech Mono',
  fontSize:12, outline:'none',
  transition:'border-color 0.2s',
  boxSizing:'border-box',
};