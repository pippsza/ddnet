/**
 * One-shot migration: Flatten DDmaX subcategories into top-level categories.
 *
 * Before: category = "ddmax", subcategory = "ddmax_easy"
 * After:  category = "ddmax_easy", subcategory removed
 *
 * Run with: npx tsx scripts/migrate-flatten-subcategories.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function migrate() {
  const payload = await getPayload({ config })

  // --- Bingo games ---
  // Query raw DB for old "subcategory" field that no longer exists in the schema
  const { docs: bingoGames } = await payload.find({
    collection: 'bingo',
    where: {
      subcategory: { exists: true },
    } as any,
    limit: 1000,
    depth: 0,
  })

  console.log(`Found ${bingoGames.length} bingo games with subcategory`)

  for (const game of bingoGames) {
    const oldSub = (game as any).subcategory as string | null
    if (oldSub) {
      console.log(
        `  Bingo ${game.id}: category "${game.category}" + subcategory "${oldSub}" → category "${oldSub}"`,
      )
      await payload.update({
        collection: 'bingo',
        id: game.id,
        data: { category: oldSub } as any,
      })
    }
  }

  // --- User raceStats: flatten ddmax.easy/next/pro/nut → ddmax_easy/ddmax_next/... ---
  const { docs: users } = await payload.find({
    collection: 'users',
    limit: 10000,
    depth: 0,
  })

  let migratedUsers = 0
  for (const user of users) {
    const raceStats = (user as any).raceStats
    if (!raceStats?.ddmax || typeof raceStats.ddmax !== 'object') continue

    const ddmax = raceStats.ddmax
    const subKeys = ['easy', 'next', 'pro', 'nut']
    let changed = false

    for (const sub of subKeys) {
      if (ddmax[sub] && typeof ddmax[sub] === 'object' && Object.keys(ddmax[sub]).length > 0) {
        raceStats[`ddmax_${sub}`] = ddmax[sub]
        changed = true
      }
    }

    if (changed) {
      // Remove old nested ddmax object, keep only the flat keys
      delete raceStats.ddmax
      migratedUsers++

      await payload.update({
        collection: 'users',
        id: user.id,
        data: { raceStats } as any,
      })
      console.log(`  User ${user.id} (${user.ingameNick}): flattened raceStats.ddmax`)
    }
  }

  console.log(`\nMigrated ${bingoGames.length} bingo games and ${migratedUsers} user raceStats`)
  console.log('Done!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
