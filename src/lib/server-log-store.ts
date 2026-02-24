/**
 * Server-side log ring buffer.
 * Intercepts console.log/warn/error and stores recent entries in memory.
 * Uses globalThis singleton to survive Next.js HMR.
 */

export interface LogEntry {
  id: number
  timestamp: string
  level: 'log' | 'warn' | 'error'
  message: string
}

interface LogStore {
  entries: LogEntry[]
  nextId: number
  initialized: boolean
  originalLog: typeof console.log
  originalWarn: typeof console.warn
  originalError: typeof console.error
}

const MAX_ENTRIES = 1000

const globalStore = globalThis as typeof globalThis & {
  __serverLogStore?: LogStore
}

function getStore(): LogStore {
  if (!globalStore.__serverLogStore) {
    globalStore.__serverLogStore = {
      entries: [],
      nextId: 1,
      initialized: false,
      originalLog: console.log,
      originalWarn: console.warn,
      originalError: console.error,
    }
  }
  return globalStore.__serverLogStore
}

function addEntry(level: LogEntry['level'], args: unknown[]): void {
  const store = getStore()
  const message = args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 0)))
    .join(' ')

  store.entries.push({
    id: store.nextId++,
    timestamp: new Date().toISOString(),
    level,
    message,
  })

  // Trim to keep only last MAX_ENTRIES
  if (store.entries.length > MAX_ENTRIES) {
    store.entries = store.entries.slice(-MAX_ENTRIES)
  }
}

export function initServerLogs(): void {
  const store = getStore()
  if (store.initialized) return
  store.initialized = true

  console.log = (...args: unknown[]) => {
    store.originalLog.apply(console, args)
    addEntry('log', args)
  }

  console.warn = (...args: unknown[]) => {
    store.originalWarn.apply(console, args)
    addEntry('warn', args)
  }

  console.error = (...args: unknown[]) => {
    store.originalError.apply(console, args)
    addEntry('error', args)
  }
}

export function getServerLogs(
  since = 0,
  level?: string,
  limit = 200,
): LogEntry[] {
  const store = getStore()
  let filtered = store.entries.filter((e) => e.id > since)
  if (level && level !== 'all') {
    filtered = filtered.filter((e) => e.level === level)
  }
  return filtered.slice(-limit)
}

export function getLatestLogId(): number {
  const store = getStore()
  const last = store.entries[store.entries.length - 1]
  return last ? last.id : 0
}
