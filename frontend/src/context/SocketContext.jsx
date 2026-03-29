import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api/axios';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token }             = useAuth();
  const socketRef             = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Cleanup previous connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Only connect if token exists
    if (!token) {
      setConnected(false);
      return;
    }

    console.log('🔌 Connecting socket with token...');

    socketRef.current = io(SOCKET_URL, {
      transports:    ['websocket'],
      auth:          { token },
      reconnection:  true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('🟢 Socket connected:', socketRef.current.id);
      setConnected(true);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('🔴 Socket error:', err.message);
      setConnected(false);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
      setConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]); // token change hone pe — reconnect with new token

  // Stable emit — checks connection first
  function emit(event, data) {
    if (!socketRef.current?.connected) {
      console.warn(`⚠ Cannot emit "${event}" — socket not connected`);
      return;
    }
    socketRef.current.emit(event, data);
  }

  // Subscribe
  function on(event, callback) {
    socketRef.current?.on(event, callback);
  }

  // Unsubscribe
  function off(event, callback) {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  }

  return (
    <SocketContext.Provider value={{ connected, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}