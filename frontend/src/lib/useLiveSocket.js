import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../features/api/apiSlice';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export function useLiveSocket() {
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          console.log('[WebSocket] Connected to RailOpt AI Telemetry Push Layer');
        };

        ws.onmessage = (messageEvent) => {
          try {
            const data = JSON.parse(messageEvent.data);
            if (!isMounted) return;
            setLastEvent(data);

            const eventType = data.event;
            console.log('[WebSocket] Received Event:', eventType, data);

            // Invalidate RTK Query caches dynamically based on broadcast event
            if (eventType === 'conflict.created') {
              dispatch(apiSlice.util.invalidateTags(['Conflicts', 'Recommendations', 'SectionState']));
            } else if (eventType === 'recommendation.ready') {
              dispatch(apiSlice.util.invalidateTags(['Recommendations']));
            } else if (eventType === 'decision.recorded') {
              dispatch(apiSlice.util.invalidateTags(['Conflicts', 'Recommendations', 'Audit', 'SectionState']));
            }
          } catch (err) {
            // Raw text (e.g. pong heartbeat)
            if (messageEvent.data === 'pong') {
              // Heartbeat acknowledged
            }
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          console.warn('[WebSocket] Disconnected. Reconnecting in 3s...');
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.error('[WebSocket] Error encountered:', err);
          ws.close();
        };
      } catch (err) {
        console.error('[WebSocket] Connection attempt failed:', err);
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    // Heartbeat ping every 25s
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send('ping');
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [dispatch]);

  return { isConnected, lastEvent };
}
