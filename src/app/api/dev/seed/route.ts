// @ts-nocheck — dev-only seed utility, types may lag behind schema changes
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Verified DDNet player names (case-sensitive, all confirmed via DDNet API)
const DDNET_PLAYERS = [
  'nameless tee', 'Starkiller', 'Brokecdx-', 'Cor', 'Pipou', 'deen',
  'fokkonaut', 'Learath2', 'Ryozuki', 'noby', 'heinrich5991',
  'BannZay', 'Patiga', 'Cøke', 'Chairn',
  'Konsti', 'Aoe', 'gerdoe', 'timakro', 'jao',
  'Ravie', 'Kicker', 'bencie', 'Welf', 'murpi',
]

// DDNet map names per category
const MAPS_BY_CATEGORY: Record<string, string[]> = {
  novice: [
    'Kobra', 'LearnToPlay', 'Sunny Side Up', 'Baby Aim', 'Stardust',
    'Crimson', 'Stronghold', 'Sunny 2', 'Greenfield', 'Cloudbreak',
    'Binary', 'BlueSkies', 'Freshman', 'Homebound', 'Littletee',
    'Moonlit', 'Newbie', 'Paradise', 'Redlight', 'Sunlight',
    'Twilight', 'WaterDance', 'Windmill', 'Zenith', 'Aurora',
  ],
  moderate: [
    'Sunset', 'Castle', 'Aqua', 'Midnight', 'Frozen Valley',
    'Redstone', 'Thunder', 'Darkwood', 'Emerald', 'Neptune',
    'Obsidian', 'Phantom', 'Quartz', 'Ruby', 'Sapphire',
    'Topaz', 'Uranium', 'Vortex', 'Whisper', 'Xenon',
    'Yonder', 'Zephyr', 'Alabaster', 'Basalt', 'Celestial',
  ],
  brutal: [
    'Multeasymap', 'Epee', 'Darkvine', 'Firefly', 'Glacier',
    'Havoc', 'Inferno', 'Jetstream', 'Kaleidoscope', 'Labyrinth',
    'Maelstrom', 'Nebula', 'Obelisk', 'Pinnacle', 'Quicksand',
    'Rampage', 'Siren', 'Tempest', 'Undertow', 'Valkyrie',
    'Wasteland', 'Xanadu', 'Yielding', 'Zenobia', 'Aftermath',
  ],
  insane: [
    'Naufrage 4', 'Thor', 'ZeroG', 'Barrage', 'Catastrophe',
    'Desolation', 'Entropy', 'Fusillade', 'Gauntlet', 'Hellfire',
    'Implosion', 'Juggernaut', 'Kinetic', 'Leviathan', 'Massacre',
    'Nightmare', 'Oblivion', 'Perdition', 'Quantum', 'Riptide',
    'Slaughter', 'Torment', 'Upheaval', 'Vendetta', 'Wrath',
  ],
  dummy: [
    'Dummy Chambers', 'DummyBridge', 'DummyLift', 'DummySwing', 'DummyToss',
    'DummyFly', 'DummyRocket', 'DummySlide', 'DummySpin', 'DummyWall',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysBack: number) {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  d.setHours(randomInt(0, 23), randomInt(0, 59))
  return d.toISOString()
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function richText(text: string) {
  return {
    root: {
      type: 'root' as const,
      children: [{
        type: 'paragraph' as const,
        children: [{ type: 'text' as const, text, version: 1 }],
        version: 1,
      }],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

async function fetchDDNetStats(playerName: string): Promise<{ points: number; rank?: number } | null> {
  try {
    const res = await fetch(`https://ddnet.org/players/?json2=${encodeURIComponent(playerName)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.player) return null
    return {
      points: data.points?.points || 0,
      rank: data.points?.rank || undefined,
    }
  } catch {
    return null
  }
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const payload = await getPayload({ config })
  const log: string[] = []
  const userIds: string[] = []

  try {
    // =========================================================================
    // 0. Update Verification Settings (Global)
    // =========================================================================
    log.push('Updating verification settings...')

    await payload.updateGlobal({
      slug: 'verification-settings',
      data: {
        servers: [
          { name: 'DDNet USA (Test)', ip: '74.91.116.114', port: 8303, region: 'NA' },
          { name: 'DDNet GER1', ip: '51.210.181.1', port: 8303, region: 'EU' },
          { name: 'DDNet GER2', ip: '51.210.181.2', port: 8303, region: 'EU' },
          { name: 'DDNet RUS', ip: '185.104.185.1', port: 8303, region: 'RU' },
          { name: 'DDNet CHN', ip: '106.75.165.1', port: 8303, region: 'AS' },
        ],
      },
    })
    log.push('  Updated verification settings with 5 servers')

    // =========================================================================
    // 1. Create Users (20 players + 1 admin) with real DDNet stats
    // =========================================================================
    log.push('Creating users with DDNet stats...')

    const adminUser = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        username: 'admin',
        password: 'admin123',
        roles: 'admin',
        isSystemVerified: true,
        ingameStats: { points: 15000, rank: 42, lastSyncedAt: new Date().toISOString() },
        bingo: {
          totalGamesPlayed: 25,
          totalGamesWon: 12,
          winRate: 48,
        },
      },
    })
    userIds.push(adminUser.id)
    log.push(`  Admin: ${adminUser.id}`)

    for (const name of DDNET_PLAYERS.slice(0, 20)) {
      try {
        // Fetch real stats from DDNet
        const stats = await fetchDDNetStats(name)
        await new Promise((r) => setTimeout(r, 100)) // rate limit

        const gamesPlayed = randomInt(5, 50)
        const gamesWon = randomInt(1, Math.floor(gamesPlayed * 0.6))

        const user = await payload.create({
          collection: 'users',
          overrideAccess: true,
          data: {
            username: name,
            password: 'test1234',
            roles: 'player',
            isSystemVerified: Math.random() > 0.3,
            ingameStats: {
              points: stats?.points || randomInt(100, 25000),
              rank: stats?.rank || randomInt(1, 5000),
              lastSyncedAt: new Date().toISOString(),
            },
            bingo: {
              totalGamesPlayed: gamesPlayed,
              totalGamesWon: gamesWon,
              winRate: Math.round((gamesWon / gamesPlayed) * 100),
            },
          },
        })
        userIds.push(user.id)
      } catch {
        log.push(`  Skipped ${name} (already exists?)`)
      }
    }
    log.push(`  Created ${userIds.length} users`)

    // =========================================================================
    // 2. Create Friend Relationships
    // =========================================================================
    log.push('Creating friendships...')
    let friendCount = 0

    for (let i = 0; i < userIds.length; i++) {
      const numFriends = randomInt(2, 5)
      const friendIndices = pickN(
        Array.from({ length: userIds.length }, (_, j) => j).filter((j) => j !== i),
        numFriends,
      )

      const friends = friendIndices.map((j) => ({
        user: userIds[j],
        addedAt: randomDate(60),
      }))

      await payload.update({
        collection: 'users',
        id: userIds[i],
        overrideAccess: true,
        data: { friend: friends },
      })
      friendCount += friends.length
    }
    log.push(`  Created ${friendCount} friend connections`)

    // =========================================================================
    // 3. Create Friend Requests (some pending)
    // =========================================================================
    log.push('Creating friend requests...')

    for (let i = 0; i < 8; i++) {
      const sender = pick(userIds)
      let recipient = pick(userIds)
      while (recipient === sender) recipient = pick(userIds)

      await payload.create({
        collection: 'friend-requests',
        overrideAccess: true,
        data: {
          sender,
          recipient,
          status: pick(['pending', 'pending', 'accepted', 'rejected']),
          message: pick([undefined, 'Hey, wanna play?', 'GG last game!', 'Add me!']),
        },
      })
    }
    log.push('  Created 8 friend requests')

    // =========================================================================
    // 4. Create Bingo Games (various statuses)
    // =========================================================================
    log.push('Creating bingo games...')

    const categories = ['novice', 'moderate', 'brutal', 'insane', 'dummy'] as const
    const gameStatuses = ['waiting', 'in_progress', 'completed', 'completed', 'completed'] as const

    for (let g = 0; g < 10; g++) {
      const category = pick([...categories])
      const mode = pick(['solo', 'team'] as const)
      const gridSize = pick(['3x3', '5x5'] as const)
      const gridNum = gridSize === '3x3' ? 9 : 25
      const status = pick([...gameStatuses])
      const mapPool = MAPS_BY_CATEGORY[category] || MAPS_BY_CATEGORY.novice
      const maps = pickN(mapPool, gridNum).map((name, i) => ({
        mapName: name,
        position: i,
      }))

      const teamPlayers1 = pickN(userIds, mode === 'team' ? 2 : 1)
      const remaining = userIds.filter((id) => !teamPlayers1.includes(id))
      const teamPlayers2 = mode === 'team' ? pickN(remaining, 2) : []

      const completedCells1 =
        status === 'completed' || status === 'in_progress'
          ? pickN(
              Array.from({ length: gridNum }, (_, i) => i),
              randomInt(2, Math.min(gridNum, 8)),
            ).map((pos) => ({ cellPosition: pos, completedAt: randomDate(3) }))
          : []

      const completedCells2 =
        mode === 'team' && (status === 'completed' || status === 'in_progress')
          ? pickN(
              Array.from({ length: gridNum }, (_, i) => i),
              randomInt(1, Math.min(gridNum, 6)),
            ).map((pos) => ({ cellPosition: pos, completedAt: randomDate(3) }))
          : []

      const teams: any[] = [
        {
          teamName: mode === 'team' ? 'Red Team' : 'Player',
          color: 'red',
          players: teamPlayers1.map((id) => ({ user: id })),
          completedCells: completedCells1,
          teamStatus: status === 'completed' ? 'winner' : status === 'in_progress' ? 'playing' : 'not_ready',
        },
      ]

      if (mode === 'team') {
        teams.push({
          teamName: 'Blue Team',
          color: 'blue',
          players: teamPlayers2.map((id) => ({ user: id })),
          completedCells: completedCells2,
          teamStatus: status === 'completed' ? 'loser' : status === 'in_progress' ? 'playing' : 'not_ready',
        })
      }

      await payload.create({
        collection: 'bingo',
        overrideAccess: true,
        data: {
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Bingo #${g + 1}`,
          mode,
          category,
          gridSize,
          winCondition: pick(['line', 'cross', 'full_house']),
          isPublic: Math.random() > 0.4,
          difficultyRange: { min: randomInt(0, 2), max: randomInt(3, 5) },
          createdBy: pick(userIds),
          inviteCode: generateInviteCode(),
          maps,
          teams,
          gameStatus: status,
          startedAt: status !== 'waiting' ? randomDate(7) : undefined,
          completedAt: status === 'completed' ? randomDate(2) : undefined,
          winnerTeam: status === 'completed' && mode === 'team' ? 0 : undefined,
        },
      })
    }
    log.push('  Created 10 bingo games')

    // =========================================================================
    // 5. Create Races
    // =========================================================================
    log.push('Creating races...')

    for (let r = 0; r < 8; r++) {
      const status = pick(['waiting', 'in_progress', 'completed', 'completed'] as const)
      const players = pickN(userIds, randomInt(2, 4))
      const totalRounds = randomInt(3, 10)
      const currentRound = status === 'completed' ? totalRounds : status === 'in_progress' ? randomInt(1, totalRounds) : 0

      const rounds: any[] = []
      for (let rnd = 1; rnd <= currentRound; rnd++) {
        rounds.push({
          roundNumber: rnd,
          mapName: pick(MAPS_BY_CATEGORY.novice),
          winner: pick(players),
          finishTime: randomInt(30, 600),
          completedAt: randomDate(5),
        })
      }

      await payload.create({
        collection: 'races',
        overrideAccess: true,
        data: {
          title: `Race #${r + 1} - ${pick(['Speed Run', 'Best of 5', 'Championship', 'Casual', 'Tryhard Mode'])}`,
          isPublic: Math.random() > 0.3,
          inviteCode: generateInviteCode(),
          category: pick(['novice', 'moderate', 'brutal']),
          totalRounds,
          currentRound,
          currentMap: status === 'in_progress' ? pick(MAPS_BY_CATEGORY.novice) : undefined,
          server: {
            ip: '74.91.116.114',
            port: 8303,
            name: 'DDNet USA (Test)',
          },
          players: players.map((id, i) => ({
            user: id,
            ingameNick: DDNET_PLAYERS[userIds.indexOf(id)] || `Player${i}`,
            roundsWon: rounds.filter((rd: any) => rd.winner === id).length,
            isReady: status !== 'waiting' || Math.random() > 0.5,
          })),
          rounds,
          winner: status === 'completed' ? pick(players) : undefined,
          status,
          createdBy: players[0],
          startedAt: status !== 'waiting' ? randomDate(5) : undefined,
          completedAt: status === 'completed' ? randomDate(2) : undefined,
        },
      })
    }
    log.push('  Created 8 races')

    // =========================================================================
    // 6. Create Notifications
    // =========================================================================
    log.push('Creating notifications...')

    const notifTypes = [
      'game_invite', 'friend_request', 'friend_accepted',
      'game_started', 'game_ended', 'system',
    ] as const

    const notifMessages: Record<string, string[]> = {
      game_invite: ['invited you to a Bingo game', 'wants you to join a Race'],
      friend_request: ['sent you a friend request'],
      friend_accepted: ['accepted your friend request'],
      game_started: ['Your bingo game has started!', 'Race is starting now!'],
      game_ended: ['Game over! Check results.', 'The race has ended.'],
      system: ['Welcome to DDNet Bingo!', 'Server maintenance scheduled.', 'New maps available!'],
    }

    for (let n = 0; n < 25; n++) {
      const type = pick([...notifTypes])
      await payload.create({
        collection: 'notifications',
        overrideAccess: true,
        data: {
          recipient: pick(userIds),
          type,
          title: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          message: pick(notifMessages[type]),
          isRead: Math.random() > 0.6,
          actionUrl: pick(['/app/bingo', '/app/race', '/app/friends', '/app/dashboard']),
          relatedUser: Math.random() > 0.5 ? pick(userIds) : undefined,
        },
      })
    }
    log.push('  Created 25 notifications')

    // =========================================================================
    // 7. Create Articles
    // =========================================================================
    log.push('Creating articles...')

    const articleTitles = [
      'DDNet Bingo Season 3 is Here!',
      'How to Get Better at Brutal Maps',
      'Community Tournament Results',
      'New Maps Added This Week',
      'Tips for New Players',
      'Top 10 Speedrunners of 2025',
    ]

    for (const title of articleTitles) {
      await payload.create({
        collection: 'articles',
        overrideAccess: true,
        data: {
          title,
          slug: slugify(title),
          excerpt: `An exciting article about ${title.toLowerCase()}.`,
          content: richText(`This is the full content of "${title}". Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`),
          author: pick(userIds),
          category: pick(['news', 'tutorial', 'guide', 'update', 'event', 'announcement']),
          tags: pickN(['ddnet', 'bingo', 'race', 'maps', 'tips', 'community', 'tournament'], randomInt(1, 3)).map((t) => ({ tag: t })),
          featured: Math.random() > 0.7,
          views: randomInt(10, 5000),
          likes: randomInt(0, 200),
        },
      })
    }
    log.push(`  Created ${articleTitles.length} articles`)

    // =========================================================================
    // 8. Create Forum Posts
    // =========================================================================
    log.push('Creating forum posts...')

    const forumPosts = [
      { title: 'Best settings for DDNet?', cat: 'help' },
      { title: 'Looking for team members', cat: 'general' },
      { title: 'Map suggestion: Midnight Rush', cat: 'suggestions' },
      { title: 'Freeze bug on Kobra', cat: 'bugs' },
      { title: 'My first insane map finish!', cat: 'general' },
      { title: 'Clan recruitment - Team Rocket', cat: 'clans' },
      { title: 'Best novice maps for beginners?', cat: 'maps' },
      { title: 'Random gaming chat', cat: 'offtopic' },
    ]

    for (const post of forumPosts) {
      const postAuthor = pick(userIds)
      const numReplies = randomInt(0, 5)
      const replies = Array.from({ length: numReplies }, () => ({
        author: pick(userIds),
        content: richText(pick([
          'I agree!', 'Great point.', 'Thanks for sharing!',
          'Can you explain more?', 'Not sure about that.',
          '+1', 'This helped me a lot, thanks!',
          'Interesting perspective.', 'I had the same issue.',
        ])),
        createdAt: randomDate(14),
        likes: randomInt(0, 20),
      }))

      await payload.create({
        collection: 'forum-posts',
        overrideAccess: true,
        data: {
          title: post.title,
          slug: slugify(post.title) + '-' + randomInt(100, 999),
          content: richText(`Discussion about: ${post.title}. What do you all think?`),
          author: postAuthor,
          category: post.cat as 'general' | 'help' | 'suggestions' | 'bugs' | 'maps' | 'clans' | 'offtopic',
          status: 'published',
          isPinned: Math.random() > 0.85,
          views: randomInt(5, 1000),
          likes: randomInt(0, 50),
          replies,
        },
      })
    }
    log.push(`  Created ${forumPosts.length} forum posts`)

    // =========================================================================
    // 9. Create Support Tickets
    // =========================================================================
    log.push('Creating support tickets...')

    const tickets: { subject: string; category: 'name_change' | 'bug_report' | 'nickname_conflict' | 'account_issues' | 'game_statistics' | 'verification_request' | 'other' }[] = [
      { subject: 'Name change request', category: 'name_change' },
      { subject: 'Cannot verify my nickname', category: 'verification_request' },
      { subject: 'Stats not updating', category: 'game_statistics' },
      { subject: 'Someone stole my nickname', category: 'nickname_conflict' },
      { subject: 'Login issues after update', category: 'account_issues' },
    ]

    for (const ticket of tickets) {
      await payload.create({
        collection: 'support',
        overrideAccess: true,
        data: {
          subject: ticket.subject,
          category: ticket.category,
          priority: pick(['low', 'medium', 'high']),
          status: pick(['open', 'in_progress', 'resolved', 'waiting_for_user']),
          description: richText(`I need help with: ${ticket.subject}. Please assist me.`),
          createdBy: pick(userIds),
          responses: Math.random() > 0.5 ? [{
            message: richText('Thank you for reaching out. We are looking into this.'),
            author: adminUser.id,
            isStaffResponse: true,
            timestamp: randomDate(3),
          }] : [],
        },
      })
    }
    log.push(`  Created ${tickets.length} support tickets`)

    // =========================================================================
    // Done
    // =========================================================================
    log.push('')
    log.push('Seed complete!')
    log.push(`  Users: ${userIds.length}`)
    log.push(`  Admin login: admin / admin123`)
    log.push(`  Player login: (any DDNet name) / test1234`)

    return NextResponse.json({ success: true, log })
  } catch (error: unknown) {
    console.error('[Seed] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Seed failed',
        log,
      },
      { status: 500 },
    )
  }
}
