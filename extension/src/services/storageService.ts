/**
 * Robust storage service for Chrome Extension persistence.
 * Leverages `chrome.storage.local` inside the extension runtime,
 * with a transparent fallback to browser `localStorage` for development environments.
 */
export class StorageService {
  private isExtensionRuntime(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.storage !== 'undefined' &&
      typeof chrome.storage.local !== 'undefined'
    );
  }

  /**
   * Retrieves a typed value from persistent storage.
   */
  public async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (this.isExtensionRuntime()) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            if (result && result[key] !== undefined) {
              resolve(result[key] as T);
            } else {
              resolve(defaultValue);
            }
          });
        });
      } else {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          return JSON.parse(stored) as T;
        }
        return defaultValue;
      }
    } catch (error) {
      console.warn(`[StorageService] Failed to retrieve key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Commits a value to persistent storage.
   */
  public async setItem<T>(key: string, value: T): Promise<void> {
    try {
      if (this.isExtensionRuntime()) {
        return new Promise((resolve, reject) => {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[StorageService] Failed to persist key "${key}":`, error);
    }
  }

  /**
   * Removes a key completely from persistent storage.
   */
  public async removeItem(key: string): Promise<void> {
    try {
      if (this.isExtensionRuntime()) {
        return new Promise((resolve, reject) => {
          chrome.storage.local.remove([key], () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`[StorageService] Failed to remove key "${key}":`, error);
    }
  }
}

export const storageService = new StorageService();
