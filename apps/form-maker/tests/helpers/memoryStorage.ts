import { vi } from 'vitest'

// localStorage en memoria para las pruebas en node. Con quotaBytes, setItem lanza el mismo
// QuotaExceededError que el navegador al pasarse.

export interface MemoryStorage extends Storage {
  quotaBytes: number | null
}

export function createMemoryStorage(): MemoryStorage {
  const data: Map<string, string> = new Map()

  const storage: MemoryStorage = {
    quotaBytes: null,
    get length(): number {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key)
    },
    setItem: (key: string, value: string) => {
      const used: number = [...data.entries()]
        .filter(([stored]) => stored !== key)
        .reduce((total, [stored, text]) => total + stored.length + text.length, 0)

      if (storage.quotaBytes !== null && used + key.length + value.length > storage.quotaBytes) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }

      data.set(key, String(value))
    },
  }

  return storage
}

// Instala uno nuevo como global; vi.unstubAllGlobals lo saca.
export function installMemoryStorage(): MemoryStorage {
  const storage: MemoryStorage = createMemoryStorage()
  vi.stubGlobal('localStorage', storage)

  return storage
}
