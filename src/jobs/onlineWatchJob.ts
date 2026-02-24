import { getPayload } from 'payload'
import config from '@/payload.config'
import { findPlayersOnline } from '@/lib/ddnet-helpers'

const WATCH_INTERVAL = parseInt(process.env.WATCH_POLL_INTERVAL_MS || '60000', 10) // 60s

let watchTimer: ReturnType<typeof setInterval> | null = null

async function runOnlineWatchJob() {
  const payload = await getPayload({ config })

  try {
    // 1. Fetch ALL watched-player docs across all users
    let page = 1
    let hasMore = true
    const allEntries: any[] = []

    while (hasMore) {
      const result = await payload.find({
        collection: 'watched-players',
        limit: 200,
        page,
        depth: 0,
        overrideAccess: true,
      })
      allEntries.push(...result.docs)
      hasMore = result.hasNextPage
      page++
    }

    if (allEntries.length === 0) return

    // 2. Deduplicate nicknames
    const uniqueNicknames = [...new Set(allEntries.map((e) => e.nickname as string))]

    console.log(
      `[OnlineWatch] Checking ${uniqueNicknames.length} unique players (${allEntries.length} total watches)`,
    )

    // 3. Batch query DDNet Master Server
    const onlineStatuses = await findPlayersOnline(uniqueNicknames)
    const onlineMap = new Map<string, (typeof onlineStatuses)[number]>()
    for (const status of onlineStatuses) {
      onlineMap.set(status.name.toLowerCase(), status)
    }

    // 4. Process each entry: detect transitions, send notifications
    for (const entry of allEntries) {
      const status = onlineMap.get((entry.nickname as string).toLowerCase())
      const isNowOnline = status?.online ?? false
      const wasOffline = !entry.lastKnownOnline

      // Detect offline → online transition
      if (isNowOnline && wasOffline && entry.notifyOnline) {
        const userId = typeof entry.user === 'string' ? entry.user : entry.user.id

        try {
          await payload.create({
            collection: 'notifications',
            data: {
              recipient: userId,
              type: 'player_online',
              title: `${entry.nickname} is now online!`,
              message: status?.server
                ? `Playing on ${status.server.name} (${status.server.map})`
                : 'Player is now online on DDNet',
              actionUrl: `/app/players/${encodeURIComponent(entry.nickname as string)}`,
            },
            overrideAccess: true,
          })
        } catch (err) {
          console.error(`[OnlineWatch] Failed to create notification for ${entry.nickname}:`, err)
        }
      }

      // 5. Update lastKnownOnline if it changed
      if (isNowOnline !== !!entry.lastKnownOnline) {
        try {
          await payload.update({
            collection: 'watched-players',
            id: entry.id,
            data: { lastKnownOnline: isNowOnline },
            overrideAccess: true,
          })
        } catch (err) {
          console.error(`[OnlineWatch] Failed to update lastKnownOnline for ${entry.id}:`, err)
        }
      }
    }
  } catch (error) {
    console.error('[OnlineWatch] Job error:', error)
  }
}

export function startOnlineWatchJob() {
  console.log(`[OnlineWatch] Starting with interval ${WATCH_INTERVAL}ms`)
  watchTimer = setInterval(() => {
    runOnlineWatchJob()
  }, WATCH_INTERVAL)
  // First run after 15s (let server fully start)
  setTimeout(() => {
    runOnlineWatchJob()
  }, 15_000)
}

export function stopOnlineWatchJob() {
  if (watchTimer) {
    clearInterval(watchTimer)
    watchTimer = null
  }
}
