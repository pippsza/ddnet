/**
 * In-memory store for "user is typing" indicators.
 * Ephemeral by design — resets on server restart, which is fine for typing status.
 *
 * Key: `${scope}:${scopeId}` (e.g. "conversation:abc123", "forum:def456", "support:ghi789")
 * Value: Map of userId -> { userName, timestamp }
 */

interface TypingEntry {
  userId: string
  userName: string
  timestamp: number
}

const TYPING_TIMEOUT_MS = 4_000

// scope:scopeId -> userId -> entry
const store = new Map<string, Map<string, TypingEntry>>()

function makeKey(scope: string, scopeId: string) {
  return `${scope}:${scopeId}`
}

export function setTyping(scope: string, scopeId: string, userId: string, userName: string) {
  const key = makeKey(scope, scopeId)
  if (!store.has(key)) {
    store.set(key, new Map())
  }
  store.get(key)!.set(userId, { userId, userName, timestamp: Date.now() })
}

export function getTypingUsers(
  scope: string,
  scopeId: string,
  excludeUserId?: string,
): Array<{ userId: string; userName: string }> {
  const key = makeKey(scope, scopeId)
  const entries = store.get(key)
  if (!entries) return []

  const now = Date.now()
  const result: Array<{ userId: string; userName: string }> = []

  for (const [uid, entry] of entries) {
    if (now - entry.timestamp > TYPING_TIMEOUT_MS) {
      entries.delete(uid)
      continue
    }
    if (uid !== excludeUserId) {
      result.push({ userId: entry.userId, userName: entry.userName })
    }
  }

  // Cleanup empty scope entries
  if (entries.size === 0) {
    store.delete(key)
  }

  return result
}

/** Returns all active typing entries for a given scope, grouped by scopeId. */
export function getAllTypingForScope(
  scope: string,
  excludeUserId?: string,
): Record<string, Array<{ userId: string; userName: string }>> {
  const prefix = `${scope}:`
  const now = Date.now()
  const result: Record<string, Array<{ userId: string; userName: string }>> = {}

  for (const [key, entries] of store) {
    if (!key.startsWith(prefix)) continue
    const scopeId = key.slice(prefix.length)
    const users: Array<{ userId: string; userName: string }> = []

    for (const [uid, entry] of entries) {
      if (now - entry.timestamp > TYPING_TIMEOUT_MS) {
        entries.delete(uid)
        continue
      }
      if (uid !== excludeUserId) {
        users.push({ userId: entry.userId, userName: entry.userName })
      }
    }

    if (entries.size === 0) {
      store.delete(key)
    }

    if (users.length > 0) {
      result[scopeId] = users
    }
  }

  return result
}
