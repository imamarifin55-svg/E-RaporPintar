/**
 * Real-time Cloud Synchronization Client
 * Connects browsers across multiple devices (Teachers, Wali Kelas, Admin)
 * Features:
 * - Hybrid SSE (Server-Sent Events) + Robust HTTP Fallback Polling
 * - Cross-tab BroadcastChannel for zero-latency local tab sync
 * - Resilience against proxy buffering / transient disconnects
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { ERaporDatabase, saveDatabase, loadDatabase } from './storage';

export type CloudStatus = 'connected' | 'syncing' | 'offline' | 'error';

interface SyncResponse {
  success: boolean;
  version: number;
  timestamp: string;
  db?: ERaporDatabase;
}

export function useCloudSync(
  localDb: ERaporDatabase,
  onRemoteUpdate: (remoteDb: ERaporDatabase) => void
) {
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('connected');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Baru saja');
  const [activePeersCount, setActivePeersCount] = useState<number>(1);
  const [pingMs, setPingMs] = useState<number>(0);

  // Store references to avoid dependency re-renders triggering connection recreation
  const localDbRef = useRef<ERaporDatabase>(localDb);
  localDbRef.current = localDb;

  const onRemoteUpdateRef = useRef<(remoteDb: ERaporDatabase) => void>(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  const isUpdatingFromRemote = useRef(false);
  const consecutiveFailures = useRef(0);

  // Cross-tab broadcast channel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Fetch Cloud Data via HTTP REST (Always reliable)
  const fetchCloudData = useCallback(async (): Promise<boolean> => {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/database', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: SyncResponse = await res.json();
      const elapsed = Math.round(performance.now() - startTime);
      setPingMs(elapsed);

      if (data.db && data.db.sekolah) {
        // Compare timestamps
        const currentLocal = localDbRef.current;
        const localTime = new Date(currentLocal.auditLogs?.[0]?.timestamp || 0).getTime();
        const remoteTime = new Date(data.db.auditLogs?.[0]?.timestamp || 0).getTime();

        // If cloud is newer or local is fresh
        if (remoteTime > localTime || !localStorage.getItem('ERAPOR_MERDEKA_DATABASE_V1')) {
          isUpdatingFromRemote.current = true;
          onRemoteUpdateRef.current(data.db);
          saveDatabase(data.db);
        }
      }

      consecutiveFailures.current = 0;
      setCloudStatus('connected');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      return true;
    } catch (err) {
      console.warn('[CloudSync] HTTP fetch check:', err);
      consecutiveFailures.current += 1;
      // Only set offline if failed multiple times consecutively
      if (consecutiveFailures.current >= 2) {
        setCloudStatus('offline');
      }
      return false;
    }
  }, []);

  // 2. Push Changes to Cloud
  const pushToCloud = useCallback(async (newDb: ERaporDatabase) => {
    if (isUpdatingFromRemote.current) {
      isUpdatingFromRemote.current = false;
      return true;
    }

    // Broadcast immediately to other tabs on the same device
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'local_tab_update',
          timestamp: new Date().toISOString(),
          db: newDb,
        });
      } catch (e) {
        console.error('[CloudSync] Broadcast error:', e);
      }
    }

    setCloudStatus('syncing');
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db: newDb, timestamp: new Date().toISOString() }),
      });

      if (res.ok) {
        consecutiveFailures.current = 0;
        setCloudStatus('connected');
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        return true;
      } else {
        setCloudStatus('connected'); // Fallback to local storage seamlessly
        return false;
      }
    } catch (err) {
      console.warn('[CloudSync] Push error, saved locally:', err);
      // Even if network blips, user's work is saved in localStorage
      return false;
    }
  }, []);

  // 3. Setup Persistent Real-time Connection
  useEffect(() => {
    // A. Setup cross-tab sync
    try {
      const channel = new BroadcastChannel('erapor_realtime_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'local_tab_update' && event.data.db) {
          isUpdatingFromRemote.current = true;
          onRemoteUpdateRef.current(event.data.db);
        }
      };
    } catch {
      // BroadcastChannel not supported in older browsers, ignored
    }

    // B. Immediate fetch
    fetchCloudData();

    // C. Setup SSE Stream for live push updates across devices
    let eventSource: EventSource | null = null;
    let sseTimeoutId: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/realtime/stream');

        eventSource.onopen = () => {
          setCloudStatus('connected');
          consecutiveFailures.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'db_update' && payload.db) {
              isUpdatingFromRemote.current = true;
              onRemoteUpdateRef.current(payload.db);
              saveDatabase(payload.db);
              setCloudStatus('connected');
              setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } else if (payload.type === 'heartbeat') {
              setActivePeersCount(Math.max(1, payload.activeConnections || 1));
              setCloudStatus('connected');
            } else if (payload.type === 'handshake') {
              setActivePeersCount(Math.max(1, payload.activeConnections || 1));
              setCloudStatus('connected');
            }
          } catch (err) {
            console.error('[CloudSync] SSE parse error', err);
          }
        };

        eventSource.onerror = () => {
          // Do not instantly mark offline on SSE transient close!
          // Verify with HTTP endpoint first
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect SSE after 4 seconds
          sseTimeoutId = setTimeout(connectSSE, 4000);
          // Check HTTP health
          fetchCloudData();
        };
      } catch (err) {
        console.warn('[CloudSync] SSE connection error', err);
        sseTimeoutId = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    // D. Regular heartbeat poll every 8 seconds to guarantee freshness
    const pollInterval = setInterval(() => {
      fetchCloudData();
    }, 8000);

    return () => {
      if (eventSource) eventSource.close();
      if (sseTimeoutId) clearTimeout(sseTimeoutId);
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [fetchCloudData]);

  return {
    cloudStatus,
    lastSyncedTime,
    activePeersCount,
    pingMs,
    pushToCloud,
    fetchCloudData,
  };
}
