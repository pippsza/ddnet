import { BaseBotMode } from './base.js'
import { BackendApi } from '../api.js'

/**
 * Verification mode - connects to a server, logs in, and uses /verify
 * to check if a player is authenticated on the DDNet server.
 */
export class VerificationMode extends BaseBotMode {
  readonly name = 'verification'
  readonly description = 'Verify player identity via /verify command on DDNet server'
  readonly requiredEnv = [
    'TARGET_NICK',
    'REQUEST_ID',
    'SERVER_IP',
    'SERVER_PORT',
    'BACKEND_URL',
    'BACKEND_SECRET',
    'BOT_LOGIN_TOKEN',
  ]

  private api: BackendApi | null = null

  init(config: Record<string, string>): void {
    super.init(config)
    this.api = new BackendApi(config.BACKEND_URL, config.BACKEND_SECRET)
  }

  async run(): Promise<void> {
    const { TARGET_NICK, REQUEST_ID, SERVER_IP, SERVER_PORT, BOT_LOGIN_TOKEN } = this.config
    const port = parseInt(SERVER_PORT)

    console.log(`[Verification] Starting for: ${TARGET_NICK}`)
    console.log(`[Verification] Server: ${SERVER_IP}:${SERVER_PORT}`)

    const client = this.createClient('BingoBot')

    try {
      // 1. Connect to server
      await client.connect(SERVER_IP, port)

      // Log ALL messages for debugging
      client.onServerMessage((text) => {
        console.log(`[Server] ${text}`)
      })
      client.onMessage((msg) => {
        console.log(`[Chat] <${msg.author}> ${msg.text}`)
      })

      // Wait for server to fully initialize our client
      console.log('[Verification] Connected, waiting for server readiness...')
      await this.sleep(3000)

      // 2. Login
      console.log('[Verification] Logging in...')
      client.say(`/login ${BOT_LOGIN_TOKEN}`)

      const loginResult = await client.waitForServerMessage(
        /\[Accounts\] Welcome back/,
        10000,
      )

      if (!loginResult) {
        console.error('[Verification] Login failed or timed out')
        await this.api!.reportError(REQUEST_ID, TARGET_NICK, 'Bot login failed')
        client.disconnect()
        return
      }

      console.log('[Verification] Login successful')

      // 3. Small delay to ensure we're ready
      await this.sleep(1000)

      // 4. Run /verify
      console.log(`[Verification] Running /verify ${TARGET_NICK}`)
      client.say(`/verify ${TARGET_NICK}`)

      // Wait for the final result (skip the "is now being checked" message)
      // Server responses:
      //   [VERIFY] "Nick" is verified as "AccountName"
      //   [VERIFY] "Nick" is not logged in!
      //   [VERIFY] "Nick" is not connected on this server.
      const verifyResult = await client.waitForServerMessage(
        new RegExp(`\\[VERIFY\\].*"${this.escapeRegex(TARGET_NICK)}".*(is verified|is not logged in|is not connected)`),
        15000,
      )

      if (!verifyResult) {
        console.error('[Verification] /verify timed out — no response from server')
        await this.api!.reportError(REQUEST_ID, TARGET_NICK, 'Verify command timed out')
        await client.gracefulDisconnect()
        return
      }

      // 5. Parse result and notify player via /whisper (server command — works for spectators)
      // DDNet has sv_spamprotection — drops messages sent <1s after the previous one.
      // /verify was the last message sent, so wait before whispering.
      await this.sleep(1500)

      if (/is verified/.test(verifyResult)) {
        console.log(`[Verification] ${TARGET_NICK} is VERIFIED`)
        client.whisper(TARGET_NICK, 'You are now verified! You can close the game.')
        await this.sleep(500)
        await this.api!.reportVerified(REQUEST_ID, TARGET_NICK, SERVER_IP, port)
      } else if (/is not logged in/.test(verifyResult)) {
        console.log(`[Verification] ${TARGET_NICK} is NOT LOGGED IN`)
        client.whisper(TARGET_NICK, 'You are not logged in. Use /login first, then try again.')
        await this.sleep(500)
        await this.api!.reportHidden(REQUEST_ID, TARGET_NICK, SERVER_IP, port)
      } else if (/is not connected/.test(verifyResult)) {
        console.log(`[Verification] ${TARGET_NICK} is NOT CONNECTED on this server`)
        await this.api!.reportNotFound(REQUEST_ID, TARGET_NICK)
      }

      // 6. Disconnect gracefully (flush + disconnect + wait)
      await client.gracefulDisconnect()
    } catch (error) {
      console.error('[Verification] Error:', error)
      await this.api!.reportError(
        REQUEST_ID,
        TARGET_NICK,
        error instanceof Error ? error.message : String(error),
      )
      await client.gracefulDisconnect()
    }

    console.log('[Verification] Finished')
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
