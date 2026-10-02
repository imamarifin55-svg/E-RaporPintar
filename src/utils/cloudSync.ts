/**
 * Real-time Cloud Synchronization Client
 * Connects browsers across multiple devices (Teachers, Wali Kelas, Admin)
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
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('syncing');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Baru saja');
  const [activePeersCount, setActivePeersCount] = useState<number>(1);
  const isUpdatingFromRemote = useRef(false);
  const localVersionRef = useRef<number>(Date.now());

  // 1. Initial Cloud Fetch & Polling Fallback
  const fetchCloudData = useCallback(async () => {
    try {
      const res = await fetch('/api/database');
      if (!res.ok) throw new Error('API offline');
      const data: SyncResponse = await res.json();
      
      if (data.db) {
        // Compare with local if cloud has newer data
        const localTime = new Date(localDb.auditLogs[0]?.timestamp || 0).getTime();
        const remoteTime = new Date(data.db.auditLogs[0]?.timestamp || 0).getTime();

        if (remoteTime > localTime || !localStorage.getItem('ERAPOR_MERDEKA_DATABASE_V1')) {
          isUpdatingFromRemote.current = true;
          onRemoteUpdate(data.db);
          saveDatabase(data.db);
        }
      }
      setCloudStatus('connected');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
    } catch {
      // Offline fallback: rely on localStorage
      setCloudStatus('offline');
    }
  }, [localDb, onRemoteUpdate]);

  // 2. Broadcast Local Changes to Cloud
  const pushToCloud = useCallback(async (newDb: ERaporDatabase) => {
    if (isUpdatingFromRemote.current) {
      isUpdatingFromRemote.current = false;
      return;
    }

    setCloudStatus('syncing');
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db: newDb, timestamp: new Date().toISOString() }),
      });

      if (res.ok) {
        setCloudStatus('connected');
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
      } else {
        setCloudStatus('offline');
      }
    } catch {
      setCloudStatus('offline');
    }
  }, []);

  // 3. Connect to Realtime EventSource (SSE)
  useEffect(() => {
    fetchCloudData();

    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    try {
      eventSource = new EventSource('/api/realtime/stream');

      eventSource.onopen = () => {
        setCloudStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'db_update' && payload.db) {
            isUpdatingFromRemote.current = true;
            onRemoteUpdate(payload.db);
            saveDatabase(payload.db);
            setCloudStatus('connected');
            setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
          } else if (payload.type === 'heartbeat') {
            setActivePeersCount(payload.activeConnections || 1);
            setCloudStatus('connected');
          }
        } catch (err) {
          console.error('SSE parse error', err);
        }
      };

      eventSource.onerror = () => {
        setCloudStatus('offline');
      };
    } catch {
      // Fallback: poll every 6 seconds
      pollInterval = setInterval(fetchCloudData, 6000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchCloudData, onRemoteUpdate]);

  return {
    cloudStatus,
    lastSyncedTime,
    activePeersCount,
    pushToCloud,
    fetchCloudData,
  };
}
