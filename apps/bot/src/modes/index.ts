import type { BotMode } from './base.js'
import { VerificationMode } from './verification.js'
import { ChatbotMode } from './chatbot.js'
import { MonitorMode } from './monitor.js'

/**
 * Registry of all available bot modes
 */
export const modes: Record<string, () => BotMode> = {
  verification: () => new VerificationMode(),
  chatbot: () => new ChatbotMode(),
  monitor: () => new MonitorMode(),
}

/**
 * Get a mode by name
 */
export function getMode(name: string): BotMode | null {
  const factory = modes[name]
  return factory ? factory() : null
}

/**
 * List all available modes with descriptions
 */
export function listModes(): { name: string; description: string; requiredEnv: string[] }[] {
  return Object.entries(modes).map(([name, factory]) => {
    const mode = factory()
    return {
      name,
      description: mode.description,
      requiredEnv: mode.requiredEnv,
    }
  })
}

export { BotMode, BaseBotMode } from './base.js'
export { VerificationMode } from './verification.js'
export { ChatbotMode } from './chatbot.js'
export { MonitorMode } from './monitor.js'
