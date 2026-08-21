/**
 * Nexvora Storage Manager
 * Safely manages data persistence, routing heavy schema snapshots to IndexedDB 
 * and lightweight configuration to chrome.storage.local.
 */

export class StorageManager {
  private dbName = 'nexvora_db';
  private dbVersion = 1;

  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('schema_snapshots')) {
          db.createObjectStore('schema_snapshots', { keyPath: 'timestamp' });
        }
      };

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async saveSchemaSnapshot(snapshot: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction('schema_snapshots', 'readwrite');
        const store = transaction.objectStore('schema_snapshots');
        
        // Assume compression happens before this step
        store.put({
          timestamp: Date.now(),
          data: snapshot
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  public async setConfig(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  public async getConfig(key: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
  }
}

export const storageManager = new StorageManager();
