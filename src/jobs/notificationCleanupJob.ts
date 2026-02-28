import { getPayload } from 'payload'
import config from '@/payload.config'

const CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutes

const RETENTION_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '5d': 5 * 24 * 60 * 60 * 1000,
  '10d': 10 * 24 * 60 * 60 * 1000,
}

async function runNotificationCleanup() {
  try {
    const payload = await getPayload({ config })

    // Get distinct retention values from users
    for (const [retention, ms] of Object.entries(RETENTION_MS)) {
      const cutoff = new Date(Date.now() - ms).toISOString()

      // Find users with this retention setting
      const { docs: users } = await payload.find({
        collection: 'users',
        where: { notificationRetention: { equals: retention } },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      })

      if (users.length === 0) continue

      const userIds = users.map((u) => u.id)

      // Bulk-delete expired notifications for these users
      const result = await payload.delete({
        collection: 'notifications',
        where: {
          and: [
            { recipient: { in: userIds } },
            { createdAt: { less_than: cutoff } },
          ],
        },
        overrideAccess: true,
      })

      const count = Array.isArray(result.docs) ? result.docs.length : 0
      if (count > 0) {
        console.log(`[NotificationCleanup] Deleted ${count} notifications (retention: ${retention})`)
      }
    }

    // Also clean up notifications for users without a retention setting (default 5d)
    const defaultCutoff = new Date(Date.now() - RETENTION_MS['5d']).toISOString()
    const { docs: usersWithoutSetting } = await payload.find({
      collection: 'users',
      where: {
        or: [
          { notificationRetention: { exists: false } },
          { notificationRetention: { equals: null } },
        ],
      },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })

    if (usersWithoutSetting.length > 0) {
      const userIds = usersWithoutSetting.map((u) => u.id)
      const result = await payload.delete({
        collection: 'notifications',
        where: {
          and: [
            { recipient: { in: userIds } },
            { createdAt: { less_than: defaultCutoff } },
          ],
        },
        overrideAccess: true,
      })

      const count = Array.isArray(result.docs) ? result.docs.length : 0
      if (count > 0) {
        console.log(`[NotificationCleanup] Deleted ${count} notifications (default retention: 5d)`)
      }
    }
  } catch (error) {
    console.error('[NotificationCleanup] Job error:', error)
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null

export function startNotificationCleanupJob() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(runNotificationCleanup, CLEANUP_INTERVAL)
  // First run after 30s (let server fully start)
  setTimeout(runNotificationCleanup, 30_000)
  console.log('[NotificationCleanup] Started cleanup job (every 30 minutes)')
}

export function stopNotificationCleanupJob() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}
