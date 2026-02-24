/**
 * In-memory store for active in-game chat sessions.
 * Messages are archived to DB (InGameMessages) when session ends.
 */

export interface InGameChatMessage {
  author: string
  text: string
  isServer: boolean
  isOwn: boolean
  timestamp: string
  skin?: string
}

export interface InGameChatSession {
  id: string
  dbId: string // Payload ChatSessions document ID
  containerId: string
  userId: string
  targetUserId: string
  targetNick: string
  serverIp: string
  serverPort: number
  serverName: string
  botName: string
  status: 'starting' | 'connected' | 'disconnected' | 'stopped' | 'login_required'
  messages: InGameChatMessage[]
  outbox: string[]
  deliveries: string[]
  startedAt: string
  lastActivityAt: string
}

// Persist across Next.js HMR in development
const globalStore = globalThis as typeof globalThis & {
  __ingameChatSessions?: Map<string, InGameChatSession>
}
if (!globalStore.__ingameChatSessions) {
  globalStore.__ingameChatSessions = new Map()
}
const sessions = globalStore.__ingameChatSessions

export function createSession(
  id: string,
  dbId: string,
  containerId: string,
  userId: string,
  targetUserId: string,
  targetNick: string,
  serverIp: string,
  serverPort: number,
  serverName: string,
  botName: string,
): InGameChatSession {
  const now = new Date().toISOString()
  const session: InGameChatSession = {
    id,
    dbId,
    containerId,
    userId,
    targetUserId,
    targetNick,
    serverIp,
    serverPort,
    serverName,
    botName,
    status: 'starting',
    messages: [],
    outbox: [],
    deliveries: [],
    startedAt: now,
    lastActivityAt: now,
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): InGameChatSession | undefined {
  return sessions.get(id)
}

export function getSessionByUserId(userId: string): InGameChatSession | undefined {
  for (const session of sessions.values()) {
    if (session.userId === userId && session.status !== 'stopped') return session
  }
  return undefined
}

export function deleteSession(id: string): void {
  sessions.delete(id)
}

export function addMessages(id: string, messages: InGameChatMessage[]): void {
  const session = sessions.get(id)
  if (!session) return
  session.messages.push(...messages)
}

export function addOutboxMessage(id: string, message: string): void {
  const session = sessions.get(id)
  if (!session) return
  session.outbox.push(message)
  session.lastActivityAt = new Date().toISOString()
  // Record as own message in chat
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

export function updateStatus(id: string, status: InGameChatSession['status']): void {
  const session = sessions.get(id)
  if (!session) return
  session.status = status
}

export function getAllActiveSessions(): InGameChatSession[] {
  return Array.from(sessions.values()).filter((s) => s.status !== 'stopped')
}
