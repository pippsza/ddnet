import { BaseBotMode } from './base.js'

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 3000
const POLL_INTERVAL_MS = 500
const MAX_SESSION_DURATION_MS = 30 * 60 * 1000 // 30 minutes hard limit
const WHISPER_INTERVAL_MS = 1100 // DDNet sv_spamprotection drops messages <1s apart

/**
 * In-game chat mode — relays whispers between a web user and their in-game friend.
 * Only captures messages from the target player, sends via /whisper.
 */
export class InGameChatMode extends BaseBotMode {
  readonly name = 'ingamechat'
  readonly description = 'In-game chat relay via whispers'
  readonly requiredEnv = [
    'SERVER_IP',
    'SERVER_PORT',
    'SESSION_ID',
    'TARGET_NICK',
    'BACKEND_URL',
    'BACKEND_SECRET',
  ]

  private sessionId = ''
  private targetNick = ''
  private backendUrl = ''
  private backendSecret = ''
  private running = false
  private pollTimer: ReturnType<typeof setInterval> | null = null
  // Track recently sent whispers to filter out server echoes
  private recentlySent: string[] = []
  // Rate limiting: queue messages and send one at a time with delay
  private sendQueue: string[] = []
  private lastSendTime = 0
  private messageBuffer: Array<{
    author: string
    text: string
    isServer: boolean
    isOwn: boolean
    timestamp: string
    skin?: string
  }> = []
  private deliveryBuffer: string[] = []

  init(config: Record<string, string>): void {
    super.init(config)
    this.sessionId = config.SESSION_ID
    this.targetNick = config.TARGET_NICK
    this.backendUrl = config.BACKEND_URL
    this.backendSecret = config.BACKEND_SECRET
  }

  private async reportToBackend(body: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${this.backendUrl}/api/ingame-chat/bot-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Secret': this.backendSecret,
        },
        body: JSON.stringify({ sessionId: this.sessionId, ...body }),
      })
    } catch (error) {
      console.error('[InGameChat] Failed to report to backend:', error)
    }
  }

  private async flushMessageBuffer(): Promise<void> {
    if (this.messageBuffer.length === 0 && this.deliveryBuffer.length === 0) return
    const messages = [...this.messageBuffer]
    const deliveries = [...this.deliveryBuffer]
    this.messageBuffer = []
    this.deliveryBuffer = []
    await this.reportToBackend({ type: 'messages', messages, deliveries })
  }

  private async pollOutbox(): Promise<void> {
    try {
      const res = await fetch(
        `${this.backendUrl}/api/ingame-chat/bot-callback?sessionId=${this.sessionId}`,
        {
          headers: { 'X-Bot-Secret': this.backendSecret },
        },
      )
      const data = await res.json()
      if (data.messages && data.messages.length > 0) {
        // Queue messages for rate-limited sending
        this.sendQueue.push(...data.messages)
      }
    } catch {
      // Silently fail — backend might be temporarily unavailable
    }
  }

  /**
   * Process one message from the send queue, respecting DDNet's
   * sv_spamprotection (1 message per second). Sends at most one
   * message per call.
   */
  private processSendQueue(): void {
    if (this.sendQueue.length === 0) return
    if (!this.client?.isConnected()) return

    const now = Date.now()
    if (now - this.lastSendTime < WHISPER_INTERVAL_MS) return

    const msg = this.sendQueue.shift()!
    this.lastSendTime = now

    // Commands (e.g. /login) go to public chat, regular messages via whisper
    if (msg.startsWith('/')) {
      console.log(`[InGameChat] Sending command: ${msg}`)
      this.client.say(msg)
    } else {
      console.log(`[InGameChat] Whispering to ${this.targetNick}: ${msg}`)
      this.recentlySent.push(msg)
      this.client.whisper(this.targetNick, msg)
    }
    this.client.flush()
  }

  async run(): Promise<void> {
    const { SERVER_IP, SERVER_PORT } = this.config
    const botName = this.config.BOT_NAME || 'ChatBot'
    const serverPassword = this.config.SERVER_PASSWORD || undefined
    const port = parseInt(SERVER_PORT, 10)
    this.running = true

    console.log(`[InGameChat] Starting as "${botName}"`)
    console.log(`[InGameChat] Session: ${this.sessionId}`)
    console.log(`[InGameChat] Target: ${this.targetNick}`)
    console.log(`[InGameChat] Connecting to ${SERVER_IP}:${port}${serverPassword ? ' (with password)' : ''}`)

    const client = this.createClient(botName, serverPassword)

    // Auto-reconnect handler
    let reconnectAttempts = 0
    client.onDisconnect(async (reason) => {
      console.log(`[InGameChat] Disconnected: ${reason}`)
      await this.reportToBackend({ type: 'status', status: 'disconnected' })

      this.messageBuffer.push({
        author: 'System',
        text: `Disconnected: ${reason}`,
        isServer: true,
        isOwn: false,
        timestamp: new Date().toISOString(),
      })
      await this.flushMessageBuffer()

      if (!this.running) return

      while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.running) {
        reconnectAttempts++
        console.log(`[InGameChat] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`)
        await this.sleep(RECONNECT_DELAY_MS)
        try {
          await client.reconnect()
          reconnectAttempts = 0
          await this.reportToBackend({ type: 'status', status: 'connected' })
          this.messageBuffer.push({
            author: 'System',
            text: 'Reconnected',
            isServer: true,
            isOwn: false,
            timestamp: new Date().toISOString(),
          })
          return
        } catch (error) {
          console.error(`[InGameChat] Reconnect failed:`, error)
        }
      }

      console.log('[InGameChat] Max reconnect attempts reached')
    })

    // Connect
    try {
      await client.connect(SERVER_IP, port)
    } catch (error) {
      console.error('[InGameChat] Initial connection failed:', error)
      await this.reportToBackend({ type: 'status', status: 'disconnected' })
      this.messageBuffer.push({
        author: 'System',
        text: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        isServer: true,
        isOwn: false,
        timestamp: new Date().toISOString(),
      })
      await this.flushMessageBuffer()
      return
    }

    await this.reportToBackend({ type: 'status', status: 'connected' })
    this.messageBuffer.push({
      author: 'System',
      text: `Connected to ${SERVER_IP}:${port}`,
      isServer: true,
      isOwn: false,
      timestamp: new Date().toISOString(),
    })

    // Listen for player messages — only from target player
    client.onMessage(({ author, text, skin }) => {
      if (author.toLowerCase() !== this.targetNick.toLowerCase()) return

      // Filter out whisper echoes: when we send /whisper, the server echoes
      // the message back with author=target. Check if this text matches
      // a recently sent message and skip it if so.
      const echoIdx = this.recentlySent.indexOf(text)
      if (echoIdx !== -1) {
        this.recentlySent.splice(echoIdx, 1)
        console.log(`[InGameChat] Whisper delivered: ${text}`)
        this.deliveryBuffer.push(text)
        return
      }

      console.log(`[InGameChat] ${author}: ${text}`)
      this.messageBuffer.push({
        author,
        text,
        isServer: false,
        isOwn: false,
        timestamp: new Date().toISOString(),
        skin,
      })
    })

    // Listen for server messages (joins, leaves, mutes, login, etc.)
    client.onServerMessage(async (text) => {
      const lower = text.toLowerCase()

      // Detect login requirement
      if (lower.includes('login first') || lower.includes('have to login') || lower.includes('must login')) {
        console.log(`[InGameChat] Server requires login: ${text}`)
        await this.reportToBackend({ type: 'status', status: 'login_required' })
        this.messageBuffer.push({
          author: 'System',
          text,
          isServer: true,
          isOwn: false,
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Detect login success
      if (lower.includes('welcome back')) {
        console.log(`[InGameChat] Login successful: ${text}`)
        await this.reportToBackend({ type: 'status', status: 'connected' })
        this.messageBuffer.push({
          author: 'System',
          text,
          isServer: true,
          isOwn: false,
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Detect login failure
      if (lower.includes('no user found') || lower.includes('wrong password') || lower.includes('login failed')) {
        console.log(`[InGameChat] Login failed: ${text}`)
        await this.reportToBackend({ type: 'status', status: 'login_failed' })
        this.messageBuffer.push({
          author: 'System',
          text,
          isServer: true,
          isOwn: false,
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Detect mute/spam protection
      if (lower.includes('muted') || lower.includes('spam')) {
        console.log(`[InGameChat] Server (mute): ${text}`)
        this.messageBuffer.push({
          author: 'System',
          text: `You have been muted by the server. Messages may be delayed or dropped.`,
          isServer: true,
          isOwn: false,
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Relay server messages that mention the target player
      if (lower.includes(this.targetNick.toLowerCase())) {
        console.log(`[InGameChat] Server: ${text}`)
        this.messageBuffer.push({
          author: 'System',
          text,
          isServer: true,
          isOwn: false,
          timestamp: new Date().toISOString(),
        })
      }
    })

    // Start poll loop
    this.pollTimer = setInterval(async () => {
      await this.flushMessageBuffer()
      await this.pollOutbox()
      this.processSendQueue()
    }, POLL_INTERVAL_MS)

    console.log('[InGameChat] Ready. Listening for messages and polling outbox.')

    // Keep running until interrupted or max duration reached
    await new Promise<void>((resolve) => {
      const shutdown = () => {
        this.running = false
        resolve()
      }
      process.on('SIGTERM', shutdown)
      process.on('SIGINT', shutdown)

      // Hard timeout — auto-exit after max session duration
      setTimeout(() => {
        console.log('[InGameChat] Max session duration reached, shutting down')
        this.messageBuffer.push({
          author: 'System',
          text: 'Chat ended: maximum session duration reached (30 min)',
          isServer: true,
          isOwn: false,
          timestamp: new Date().toISOString(),
        })
        shutdown()
      }, MAX_SESSION_DURATION_MS)
    })
  }

  async cleanup(): Promise<void> {
    this.running = false
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    await this.flushMessageBuffer()
    await this.reportToBackend({ type: 'status', status: 'stopped' })
    await super.cleanup()
  }
}
