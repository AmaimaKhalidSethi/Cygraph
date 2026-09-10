import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const colors = {
    success: '#52b788',
    error:   '#ff2244',
    warn:    '#f4a261',
    info:    '#00d4ff',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position:'fixed', top:70, right:16,
        display:'flex', flexDirection:'column',
        gap:8, zIndex:99999,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background:'#060f1e',
            border:`1px solid ${colors[t.type]}`,
            color:  colors[t.type],
            padding:'10px 16px',
            fontFamily:'Share Tech Mono',
            fontSize:11,
            minWidth:260,
            animation:'slideIn 0.2s ease',
            boxShadow:`0 0 12px ${colors[t.type]}33`,
          }}>
            {{success:'✅',error:'❌',warn:'⚠️',info:'ℹ️'}[t.type]} {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}