// lib/offline/sync.ts
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { processQueue, getQueueStats, resetQueueRetries, clearFailedItems } from './queue'
import { toast } from 'sonner'

// Global state to prevent redundant listeners and sync storms
let isGlobalSyncing = false;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 5000; // 5 seconds minimum between automated syncs

// Check if online (Module level to keep state consistent)
let globalOnlineStatus = typeof window !== 'undefined' ? navigator.onLine : true;
const onlineListeners = new Set<(online: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    globalOnlineStatus = true;
    onlineListeners.forEach(l => l(true));
    // Trigger deliberate summary toast instead of multiple small ones
    toast.success('System Online', {
      description: 'Attempting to sync local changes...',
      id: 'online-status-toast'
    });
    syncNow();
  });

  window.addEventListener('offline', () => {
    globalOnlineStatus = false;
    onlineListeners.forEach(l => l(false));
    toast.warning('System Offline', {
      description: 'Changes will be saved to your device',
      id: 'online-status-toast'
    });
  });
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(globalOnlineStatus);

  useEffect(() => {
    const listener = (status: boolean) => setIsOnline(status);
    onlineListeners.add(listener);
    return () => {
      onlineListeners.delete(listener);
    }
  }, []);

  return isOnline;
}

// Sync now with primitive locking
export async function syncNow(): Promise<boolean> {
  if (!navigator.onLine || isGlobalSyncing) {
    return false;
  }

  // Throttle automated syncs
  const now = Date.now();
  if (now - lastSyncTime < 2000) { // 2 second hard throttle
    return false;
  }

  try {
    isGlobalSyncing = true;
    lastSyncTime = now;

    const result = await processQueue();

    if (result.processed > 0) {
      toast.success('Sync Complete', {
        description: `Successfully uploaded ${result.processed} items.`,
        duration: 3000,
      });
    }

    if (result.failed > 0) {
      toast.error('Sync Summary', {
        description: `${result.failed} items failed to upload. Check your connection.`,
      });
    }

    return result.remaining === 0;
  } catch (error) {
    console.error('Core Sync error:', error);
    return false;
  } finally {
    isGlobalSyncing = false;
  }
}

// Auto-sync hook
export function useAutoSync(intervalMs: number = 60000) {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, retrying: 0, failed: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateStats = useCallback(async () => {
    const queueStats = await getQueueStats();
    setStats(queueStats);
  }, []);

  // Update stats periodically
  useEffect(() => {
    updateStats();
    const id = setInterval(updateStats, 5000);
    return () => clearInterval(id);
  }, [updateStats]);

  // Handle automated sync trigger
  useEffect(() => {
    if (!isOnline) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const triggerSync = async () => {
      if (isGlobalSyncing) return;

      const currentStats = await getQueueStats();
      if (currentStats.total === 0) return;

      setIsSyncing(true);
      await syncNow();
      setIsSyncing(false);
      await updateStats();
    };

    // Initial sync check when coming online
    triggerSync();

    // Set up interval for background sync
    intervalRef.current = setInterval(triggerSync, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, intervalMs, updateStats]);

  return { isOnline, isSyncing: isSyncing || isGlobalSyncing, stats, syncNow, resetQueueRetries, clearFailedItems };
}

// Background sync (Generic fallback)
export function registerBackgroundSync() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if ('sync' in registration) {
        // @ts-ignore
        return (registration as any).sync.register('sync-queue');
      }
    }).catch(console.error);
  }
}
