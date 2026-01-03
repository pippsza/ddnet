import { BaseBotMode } from './base.js'

/**
 * Chatbot mode - connects to a server and responds to chat commands
 * Useful for server moderation or providing info to players
 */
export class ChatbotMode extends BaseBotMode {
  readonly name = 'chatbot'
  readonly description = 'Interactive chatbot that responds to commands'
  readonly requiredEnv = ['SERVER_IP', 'SERVER_PORT', 'BOT_NAME']

  private commandPrefix = ';'
  private commands: Map<string, (author: string, args: string[]) => void> = new Map()

  init(config: Record<string, string>): void {
    super.init(config)

    if (config.COMMAND_PREFIX) {
      this.commandPrefix = config.COMMAND_PREFIX
    }

    this.registerDefaultCommands()
  }

  private registerDefaultCommands(): void {
    this.commands.set('help', () => {
      const cmds = Array.from(this.commands.keys()).join(', ')
      this.client?.say(`Commands: ${this.commandPrefix}${cmds.split(', ').join(`, ${this.commandPrefix}`)}`)
    })

    this.commands.set('players', () => {
      const players = this.client?.getPlayers() || []
      this.client?.say(`Online: ${players.map((p) => p.name).join(', ')}`)
    })

    this.commands.set('info', () => {
      this.client?.say('DDNet Bingo Bot | github.com/your-repo')
    })
  }

  /**
   * Register a custom command handler
   */
  registerCommand(name: string, handler: (author: string, args: string[]) => void): void {
    this.commands.set(name, handler)
  }

  async run(): Promise<void> {
    const { SERVER_IP, SERVER_PORT, BOT_NAME } = this.config

    console.log(`[Chatbot] Starting as ${BOT_NAME}`)
    console.log(`[Chatbot] Connecting to ${SERVER_IP}:${SERVER_PORT}`)

    const client = this.createClient(BOT_NAME)

    await client.connect(SERVER_IP, parseInt(SERVER_PORT, 10))

    client.onMessage(({ author, text }) => {
      if (!text.startsWith(this.commandPrefix)) return

      const parts = text.slice(this.commandPrefix.length).split(' ')
      const command = parts[0].toLowerCase()
      const args = parts.slice(1)

      const handler = this.commands.get(command)
      if (handler) {
        console.log(`[Chatbot] Command from ${author}: ${command}`)
        handler(author, args)
      }
    })

    console.log(`[Chatbot] Ready. Listening for ${this.commandPrefix} commands`)

    // Keep running until interrupted
    await new Promise<void>((resolve) => {
      process.on('SIGTERM', () => resolve())
      process.on('SIGINT', () => resolve())
    })
  }
}
