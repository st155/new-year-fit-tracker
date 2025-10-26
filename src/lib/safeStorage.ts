/**
 * Safe storage wrapper that falls back to in-memory storage
 * when localStorage is unavailable (e.g., in iframe contexts)
 */

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const isAvailable = isLocalStorageAvailable();

// In-memory fallback storage
const memoryStorage: Record<string, string> = {};

export const safeStorage = isAvailable
  ? window.localStorage
  : {
      getItem: (key: string): string | null => {
        return key in memoryStorage ? memoryStorage[key] : null;
      },
      setItem: (key: string, value: string): void => {
        memoryStorage[key] = value;
      },
      removeItem: (key: string): void => {
        delete memoryStorage[key];
      },
      clear: (): void => {
        Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
      },
      get length(): number {
        return Object.keys(memoryStorage).length;
      },
      key: (index: number): string | null => {
        const keys = Object.keys(memoryStorage);
        return index >= 0 && index < keys.length ? keys[index] : null;
      },
    };

console.log(`[SafeStorage] Using ${isAvailable ? 'localStorage' : 'in-memory fallback'}`);
