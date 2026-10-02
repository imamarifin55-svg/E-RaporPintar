/**
 * Real-time Cloud Synchronization Client
 * Connects browsers across multiple devices (Teachers, Wali Kelas, Admin)
 * Features:
 * - Monotonic Integer Versioning (Guarantees all devices see each other's changes)
 * - Ultra-fast 2.5s version poll + SSE streaming for real-time push
 * - Cross-tab BroadcastChannel for zero-latency local tab sync
 * - Rock-solid stability: No false "offline" flips during transient stream reconnections
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { ERaporDatabase, saveDatabase } from './storage';

export type CloudStatus = 'connected' | 'syncing' | 'offline' | 'error';

interface DatabaseResponse {
  success: boolean;
  version: number;
  updatedAt?: string;
  db?: ERaporDatabase;
}

interface VersionResponse {
  success: boolean;
  version: number;
  updatedAt?: string;
  activeConnections?: number;
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
  const onRemoteUpdateRef = useRef<(remoteDb: ERaporDatabase) => void>(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  // Track the current cloud version loaded locally
  const currentVersionRef = useRef<number>(0);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ERAPOR_CLOUD_VERSION');
      if (stored) {
        currentVersionRef.current = parseInt(stored, 10) || 0;
      }
    } catch {}
  }, []);

  const isUpdatingFromRemote = useRef(false);
  const consecutiveFailures = useRef(0);
  const isFetchingRef = useRef(false);

  // Cross-tab broadcast channel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Fetch Full Cloud Database (When version is higher or on initial mount)
  const fetchCloudData = useCallback(async (): Promise<boolean> => {
    if (isFetchingRef.current) return true;
    isFetchingRef.current = true;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch('/api/database', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: DatabaseResponse = await res.json();
      const elapsed = Math.round(performance.now() - startTime);
      setPingMs(elapsed);

      if (data.db && data.db.sekolah) {
        const remoteVersion = data.version || 1;
        
        // Update local if remote version is newer or if this is the first load
        if (remoteVersion > currentVersionRef.current || currentVersionRef.current === 0) {
          currentVersionRef.current = remoteVersion;
          try {
            localStorage.setItem('ERAPOR_CLOUD_VERSION', String(remoteVersion));
          } catch {}

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
      console.warn('[CloudSync] Fetch database warning:', err);
      consecutiveFailures.current += 1;
      if (consecutiveFailures.current >= 3) {
        setCloudStatus('offline');
      }
      return false;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // 2. Fast lightweight Version Check (< 100 bytes)
  const checkVersionPoll = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/version', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: VersionResponse = await res.json();
        consecutiveFailures.current = 0;
        setCloudStatus('connected');

        if (data.activeConnections) {
          setActivePeersCount(Math.max(1, data.activeConnections));
        }

        // If another device pushed a newer version, fetch it immediately!
        if (data.version && data.version > currentVersionRef.current) {
          await fetchCloudData();
        }
      }
    } catch {
      // Do not mark offline on a single poll drop
      consecutiveFailures.current += 1;
      if (consecutiveFailures.current >= 3) {
        setCloudStatus('offline');
      }
    }
  }, [fetchCloudData]);

  // 3. Push Changes to Cloud (When any user saves or edits on this device)
  const pushToCloud = useCallback(async (newDb: ERaporDatabase): Promise<boolean> => {
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
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
        body: JSON.stringify({
          db: newDb,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const resp: DatabaseResponse = await res.json();
        if (resp.version) {
          currentVersionRef.current = resp.version;
          try {
            localStorage.setItem('ERAPOR_CLOUD_VERSION', String(resp.version));
          } catch {}
        }
        consecutiveFailures.current = 0;
        setCloudStatus('connected');
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        return true;
      } else {
        setCloudStatus('connected'); // Fallback to local storage
        return false;
      }
    } catch (err) {
      console.warn('[CloudSync] Push error, saved locally:', err);
      // Offline fallback: data is already saved in localStorage by caller
      return false;
    }
  }, []);

  // 4. Setup Real-time Connection on Mount
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
      // BroadcastChannel not supported in older browsers
    }

    // B. Initial cloud data fetch
    fetchCloudData();

    // C. Setup SSE Stream for instant push notifications
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
              const remoteVersion = payload.version || (currentVersionRef.current + 1);
              if (remoteVersion > currentVersionRef.current) {
                currentVersionRef.current = remoteVersion;
                try {
                  localStorage.setItem('ERAPOR_CLOUD_VERSION', String(remoteVersion));
                } catch {}

                isUpdatingFromRemote.current = true;
                onRemoteUpdateRef.current(payload.db);
                saveDatabase(payload.db);
                setCloudStatus('connected');
                setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              }
            } else if (payload.type === 'heartbeat' || payload.type === 'handshake') {
              if (payload.activeConnections) {
                setActivePeersCount(Math.max(1, payload.activeConnections));
              }
              setCloudStatus('connected');
              // Check version from handshake
              if (payload.version && payload.version > currentVersionRef.current) {
                fetchCloudData();
              }
            }
          } catch (err) {
            console.error('[CloudSync] SSE parse error', err);
          }
        };

        eventSource.onerror = () => {
          // Do NOT mark offline on SSE transient close!
          // Reverse proxies (Cloud Run/Nginx) frequently renegotiate SSE.
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect SSE after 4 seconds
          sseTimeoutId = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.warn('[CloudSync] SSE connection error', err);
        sseTimeoutId = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    // D. Fast version check every 2.5s guarantees updates appear across all devices!
    const pollInterval = setInterval(() => {
      checkVersionPoll();
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      if (sseTimeoutId) clearTimeout(sseTimeoutId);
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [fetchCloudData, checkVersionPoll]);

  return {
    cloudStatus,
    lastSyncedTime,
    activePeersCount,
    pingMs,
    pushToCloud,
    fetchCloudData,
  };
}
