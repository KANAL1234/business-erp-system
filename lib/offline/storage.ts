// lib/offline/storage.ts
import localforage from 'localforage'

// Configure offline storage
export const offlineStore = localforage.createInstance({
  name: 'business-erp-software-driver-app',
  storeName: 'offline_data',
  description: 'Offline data storage for Business-ERP-Software Driver App'
})

export const syncQueueStore = localforage.createInstance({
  name: 'business-erp-software-driver-app',
  storeName: 'sync_queue',
  description: 'Queue for pending sync operations'
})

// Storage keys
export const STORAGE_KEYS = {
  POS_SALES: 'offline_pos_sales',
  FUEL_LOGS: 'offline_fuel_logs',
  PRODUCTS: 'cached_products',
  INVENTORY: 'cached_inventory',
  USER_PROFILE: 'user_profile',
  LAST_SYNC: 'last_sync_time'
}

// Get item from offline storage
export async function getOfflineData<T>(key: string): Promise<T | null> {
  try {
    return await offlineStore.getItem<T>(key)
  } catch (error) {
    console.error(`Error getting offline data for key ${key}:`, error)
    return null
  }
}

// Set item in offline storage
export async function setOfflineData<T>(key: string, value: T): Promise<void> {
  try {
    await offlineStore.setItem(key, value)
  } catch (error) {
    console.error(`Error setting offline data for key ${key}:`, error)
    throw error
  }
}

// Remove item from offline storage
export async function removeOfflineData(key: string): Promise<void> {
  try {
    await offlineStore.removeItem(key)
  } catch (error) {
    console.error(`Error removing offline data for key ${key}:`, error)
  }
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  try {
    await offlineStore.clear()
    await syncQueueStore.clear()
  } catch (error) {
    console.error('Error clearing offline data:', error)
  }
}

// Check storage usage
export async function getStorageInfo() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota 
        ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(2) 
        : '0'
    }
  }
  return null
}
