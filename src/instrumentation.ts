/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (both dev and production).
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run on the server (Node.js runtime), not during build or on edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initServerLogs } = await import('@/lib/server-log-store')
    initServerLogs()

    const { startDDNetSyncJob } = await import('@/jobs/ddnetSyncJob')
    const { startBotCleanupJob } = await import('@/jobs/botCleanup')
    const { startGameProgressJob } = await import('@/jobs/gameProgressJob')

    const { startOnlineWatchJob } = await import('@/jobs/onlineWatchJob')
    const { startNotificationCleanupJob } = await import('@/jobs/notificationCleanupJob')

    // Ensure default role exists before starting jobs
    const { getPayload } = await import('payload')
    const payloadConfig = await import('@payload-config')
    const payload = await getPayload({ config: payloadConfig.default })
    const { ensureDefaultRole } = await import('@/lib/ensure-default-role')
    await ensureDefaultRole(payload)

    startDDNetSyncJob()
    startBotCleanupJob()
    startGameProgressJob()
    startOnlineWatchJob()
    startNotificationCleanupJob()

    console.log('[Instrumentation] All background jobs started')
  }
}
