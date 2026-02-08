import { getBotManager } from '@/services/verification/BotManager'
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * Cleanup stale bots - run periodically (e.g., every 5 minutes)
 * - Stops containers that have been running for more than 30 minutes
 * - Syncs database records with actual running containers
 */
export async function cleanupStaleBots(): Promise<void> {
  try {
    const botManager = getBotManager()
    const payload = await getPayload({ config })

    // Cleanup stale containers
    const cleaned = await botManager.cleanupStale()
    if (cleaned > 0) {
      console.log(`[BotCleanup] Cleaned ${cleaned} stale bots`)
    }

    // Sync database with actual running containers
    const { docs: dbBots } = await payload.find({
      collection: 'bots',
      where: { status: { equals: 'running' } },
      limit: 100,
    })

    const activeBots = botManager.getActiveBots()
    const activeIds = new Set(activeBots.map((b) => b.containerId))

    for (const dbBot of dbBots) {
      if (!activeIds.has(dbBot.containerId)) {
        await payload.update({
          collection: 'bots',
          id: dbBot.id,
          data: {
            status: 'stopped',
          },
        })
      }
    }
  } catch (error) {
    console.error('[BotCleanup] Error:', error)
  }
}

// Auto-run cleanup every 5 minutes when imported
let cleanupInterval: ReturnType<typeof setInterval> | null = null

export function startBotCleanupJob(): void {
  if (cleanupInterval) return

  cleanupInterval = setInterval(cleanupStaleBots, 5 * 60 * 1000)
  console.log('[BotCleanup] Started cleanup job (every 5 minutes)')
}

export function stopBotCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
