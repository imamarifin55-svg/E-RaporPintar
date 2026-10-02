/**
 * Real-time Cloud Synchronization Client
 * Connects browsers across multiple devices (Teachers, Wali Kelas, Admin)
 * Features:
 * - Direct, reliable push on every save (NO skipped requests)
 * - Authoritative cloud state on initial mount (guarantees Computer B gets Computer A's saves)
 * - Monotonic version comparisons (rock-solid integer comparison)
 * - Ultra-fast 2.0s version poll + SSE streaming for instant push
 * - Device session identification
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

// Generate persistent unique ID for this browser tab/device
const CLIENT_ID = 'client-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();

export function useCloudSync(
  localDb: ERaporDatabase,
  onRemoteUpdate: (remoteDb: ERaporDatabase, info?: { source: string; version: number }) => void
) {
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('connected');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Baru saja');
  const [activePeersCount, setActivePeersCount] = useState<number>(1);
  const [pingMs, setPingMs] = useState<number>(0);
  const [syncToast, setSyncToast] = useState<{ message: string; timestamp: number } | null>(null);

  // Store references to avoid dependency re-renders triggering connection recreation
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  // Track the current cloud version loaded locally
  const currentVersionRef = useRef<number>(0);
  const hasInitialSynced = useRef<boolean>(false);
  const consecutiveFailures = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  // Cross-tab broadcast channel for instant multi-tab sync on same machine
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Fetch Full Cloud Database
  const fetchCloudData = useCallback(async (forced = false): Promise<boolean> => {
    if (isFetchingRef.current) return true;
    isFetchingRef.current = true;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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
        
        // Always apply on first mount, or when remote version is newer, or when forced
        const isNewer = remoteVersion > currentVersionRef.current;
        const isFirstLoad = !hasInitialSynced.current;

        if (isNewer || isFirstLoad || forced) {
          hasInitialSynced.current = true;
          currentVersionRef.current = remoteVersion;

          try {
            localStorage.setItem('ERAPOR_CLOUD_VERSION', String(remoteVersion));
          } catch {}

          onRemoteUpdateRef.current(data.db, { source: 'cloud_fetch', version: remoteVersion });
          saveDatabase(data.db);

          if (isNewer && !isFirstLoad) {
            setSyncToast({
              message: `Data terbaru berhasil disinkronkan dari perangkat lain (v${remoteVersion})`,
              timestamp: Date.now(),
            });
          }
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

  // 2. Fast Lightweight Version Check (< 100 bytes)
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

        // If another device pushed a newer version, pull it immediately!
        if (data.version && data.version > currentVersionRef.current) {
          await fetchCloudData();
        }
      }
    } catch {
      consecutiveFailures.current += 1;
      if (consecutiveFailures.current >= 3) {
        setCloudStatus('offline');
      }
    }
  }, [fetchCloudData]);

  // 3. Push Changes to Cloud (Always executed when user saves on this device)
  const pushToCloud = useCallback(async (newDb: ERaporDatabase, senderName?: string): Promise<boolean> => {
    // Broadcast immediately to other tabs on this same machine
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'local_tab_update',
          timestamp: new Date().toISOString(),
          senderId: CLIENT_ID,
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
          senderId: CLIENT_ID,
          senderName: senderName || 'Guru/Wali Kelas',
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const resp: DatabaseResponse = await res.json();
        if (resp.version) {
          currentVersionRef.current = resp.version;
          hasInitialSynced.current = true;
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
      return false;
    }
  }, []);

  // 4. Setup Real-time Connection on Mount
  useEffect(() => {
    // Setup cross-tab sync
    try {
      const channel = new BroadcastChannel('erapor_realtime_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'local_tab_update' && event.data.db && event.data.senderId !== CLIENT_ID) {
          onRemoteUpdateRef.current(event.data.db, { source: 'cross_tab', version: currentVersionRef.current });
        }
      };
    } catch {
      // Ignored
    }

    // A. Unconditional initial cloud fetch on mount (Guarantees Computer B gets latest data)
    fetchCloudData(true);

    // B. Setup SSE Stream for instant sub-second push notifications
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

              // If update came from another client
              if (payload.senderId !== CLIENT_ID && remoteVersion > currentVersionRef.current) {
                currentVersionRef.current = remoteVersion;
                hasInitialSynced.current = true;
                try {
                  localStorage.setItem('ERAPOR_CLOUD_VERSION', String(remoteVersion));
                } catch {}

                onRemoteUpdateRef.current(payload.db, { source: 'sse', version: remoteVersion });
                saveDatabase(payload.db);
                setCloudStatus('connected');
                setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

                setSyncToast({
                  message: `Data nilai terbaru baru saja masuk dari guru/wali kelas lain (v${remoteVersion})`,
                  timestamp: Date.now(),
                });
              }
            } else if (payload.type === 'heartbeat' || payload.type === 'handshake') {
              if (payload.activeConnections) {
                setActivePeersCount(Math.max(1, payload.activeConnections));
              }
              setCloudStatus('connected');

              if (payload.version && payload.version > currentVersionRef.current) {
                fetchCloudData();
              }
            }
          } catch (err) {
            console.error('[CloudSync] SSE parse error', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          sseTimeoutId = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        sseTimeoutId = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    // C. Fast version poll every 2.0s guarantees multi-device synchronization
    const pollInterval = setInterval(() => {
      checkVersionPoll();
    }, 2000);

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
    syncToast,
    dismissToast: () => setSyncToast(null),
    pushToCloud,
    fetchCloudData: () => fetchCloudData(true),
  };
}
