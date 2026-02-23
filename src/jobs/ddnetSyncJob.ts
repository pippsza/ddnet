import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPlayerData, getPlayerSkinInfo } from '@/lib/ddnet-helpers'

const SYNC_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
const BATCH_DELAY = 200 // ms between requests to not hammer DDNet API

let syncTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Sync DDNet stats for a single user
 */
async function syncUserStats(userId: string, ingameNick: string) {
  const payload = await getPayload({ config })

  try {
    const playerData = await getPlayerData(ingameNick, true) // bypass cache for fresh data
    if (!playerData) {
      return { success: false, reason: 'Player not found on DDNet' }
    }

    // Try to get skin via DDStats (works offline) or Master Server (online only)
    const skinInfo = await getPlayerSkinInfo(ingameNick)
    const skinUpdate = skinInfo ? { skin: skinInfo } : {}

    await payload.update({
      collection: 'users',
      id: userId,
      overrideAccess: true, // bypass field-level access (ingameStats is admin-only)
      data: {
        ingameStats: {
          points: playerData.points,
          rank: playerData.rank ?? undefined,
          lastSyncedAt: new Date().toISOString(),
          ...skinUpdate,
        },
      },
    })

    return { success: true }
  } catch (error) {
    console.error(`[DDNet Sync] Error syncing user ${ingameNick}:`, error)
    return { success: false, reason: String(error) }
  }
}

/**
 * Run the full sync for all users
 */
export async function runDDNetSyncJob() {
  const payload = await getPayload({ config })

  console.log('[DDNet Sync] Starting daily sync...')

  try {
    // Paginate through all users
    let page = 1
    let totalSynced = 0
    let totalFailed = 0
    let hasMore = true

    while (hasMore) {
      const { docs: users, hasNextPage } = await payload.find({
        collection: 'users',
        limit: 50,
        page,
        select: {
          ingameNick: true,
        },
      })

      for (const user of users) {
        if (!user.ingameNick) continue

        const result = await syncUserStats(user.id, user.ingameNick)
        if (result.success) {
          totalSynced++
        } else {
          totalFailed++
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
      }

      hasMore = hasNextPage
      page++
    }

    console.log(
      `[DDNet Sync] Completed. Synced: ${totalSynced}, Failed: ${totalFailed}`,
    )
  } catch (error) {
    console.error('[DDNet Sync] Job failed:', error)
  }
}

/**
 * Start the periodic sync job
 */
export function startDDNetSyncJob() {
  console.log('[DDNet Sync] Scheduling daily sync job')

  // Run first sync after 10 seconds (let server fully start)
  syncTimer = setTimeout(async () => {
    await runDDNetSyncJob()

    // Then schedule every 24 hours
    syncTimer = setInterval(() => {
      runDDNetSyncJob()
    }, SYNC_INTERVAL)
  }, 10_000)
}

/**
 * Stop the sync job
 */
export function stopDDNetSyncJob() {
  if (syncTimer) {
    clearInterval(syncTimer)
    clearTimeout(syncTimer)
    syncTimer = null
  }
}
