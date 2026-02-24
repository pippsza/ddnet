/**
 * In-memory store for container test sessions.
 * Ephemeral by design — admin connects a test bot, chats, disconnects.
 */

export interface TestMessage {
  author: string
  text: string
  isServer: boolean
  isOwn: boolean
  timestamp: string
  skin?: string
}

export interface TestSession {
  id: string
  containerId: string
  serverIp: string
  serverPort: number
  botName: string
  status: 'starting' | 'connected' | 'disconnected' | 'stopped' | 'login_required'
  messages: TestMessage[]
  outbox: string[]
  deliveries: string[]
  startedAt: string
}

// Use globalThis to persist sessions across Next.js HMR in development
const globalStore = globalThis as typeof globalThis & {
  __containerTestSessions?: Map<string, TestSession>
}
if (!globalStore.__containerTestSessions) {
  globalStore.__containerTestSessions = new Map()
}
const sessions = globalStore.__containerTestSessions

export function createSession(
  id: string,
  containerId: string,
  serverIp: string,
  serverPort: number,
  botName: string,
): TestSession {
  const session: TestSession = {
    id,
    containerId,
    serverIp,
    serverPort,
    botName,
    status: 'starting',
    messages: [],
    outbox: [],
    deliveries: [],
    startedAt: new Date().toISOString(),
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): TestSession | undefined {
  return sessions.get(id)
}

export function deleteSession(id: string): void {
  sessions.delete(id)
}

export function getActiveSession(): TestSession | undefined {
  for (const session of sessions.values()) {
    if (session.status !== 'stopped') return session
  }
  return undefined
}

export function addMessages(id: string, messages: TestMessage[]): void {
  const session = sessions.get(id)
  if (!session) return
  session.messages.push(...messages)
}

export function addOutboxMessage(id: string, message: string): void {
  const session = sessions.get(id)
  if (!session) return
  session.outbox.push(message)
  // Also record as own message in chat
  session.messages.push({
    author: session.botName,
    text: message,
    isServer: false,
    isOwn: true,
    timestamp: new Date().toISOString(),
  })
}

export function popOutbox(id: string): string[] {
  const session = sessions.get(id)
  if (!session) return []
  const messages = [...session.outbox]
  session.outbox = []
  return messages
}

export function addDeliveries(id: string, texts: string[]): void {
  const session = sessions.get(id)
  if (!session) return
  session.deliveries.push(...texts)
}

export function popDeliveries(id: string): string[] {
  const session = sessions.get(id)
  if (!session) return []
  const deliveries = [...session.deliveries]
  session.deliveries = []
  return deliveries
}

export function updateStatus(id: string, status: TestSession['status']): void {
  const session = sessions.get(id)
  if (!session) return
  session.status = status
}
