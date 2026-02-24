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
    const { startBingoProgressJob } = await import('@/jobs/bingoProgressJob')

    startDDNetSyncJob()
    startBotCleanupJob()
    startBingoProgressJob()

    console.log('[Instrumentation] All background jobs started')
  }
}
