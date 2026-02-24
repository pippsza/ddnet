// @ts-nocheck — dev-only seed utility, types may lag behind schema changes
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// ── Name pools ──────────────────────────────────────────────────────────────
const DDNET_PLAYERS = [
  'nameless tee', 'Starkiller', 'Brokecdx-', 'Cor', 'Pipou', 'deen',
  'fokkonaut', 'Learath2', 'Ryozuki', 'noby', 'heinrich5991',
  'BannZay', 'Patiga', 'Cøke', 'Chairn',
  'Konsti', 'Aoe', 'gerdoe', 'timakro', 'jao',
  'Ravie', 'Kicker', 'bencie', 'Welf', 'murpi',
]

const GENERATED_ADJECTIVES = [
  'Swift', 'Dark', 'Frozen', 'Crimson', 'Silent', 'Iron', 'Golden',
  'Shadow', 'Storm', 'Blazing', 'Mystic', 'Lunar', 'Solar', 'Neon',
  'Cosmic', 'Frost', 'Thunder', 'Electric', 'Phantom', 'Crystal',
]

const GENERATED_NOUNS = [
  'Runner', 'Wolf', 'Eagle', 'Knight', 'Fox', 'Dragon', 'Phoenix',
  'Tiger', 'Hawk', 'Bear', 'Shark', 'Lion', 'Viper', 'Falcon',
  'Panther', 'Raven', 'Cobra', 'Lynx', 'Scorpion', 'Mantis',
]

const SKINS = [
  'default', 'bluekitty', 'brownbear', 'cammo', 'cammostripes',
  'coala', 'limekitty', 'pinky', 'redbopp', 'redstripe',
  'saddo', 'toptri', 'twintri', 'warpaint',
]

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

const ARTICLE_TOPICS = [
  'DDNet Bingo Season', 'How to Get Better at Brutal Maps', 'Community Tournament Results',
  'New Maps Added This Week', 'Tips for New Players', 'Top 10 Speedrunners',
  'Understanding Freeze Mechanics', 'Best Practices for Team Play', 'Map Design Guide',
  'Server Configuration Tips', 'Advanced Movement Techniques', 'Dummy Map Strategies',
  'Insane Map Survival Guide', 'DDNet History', 'Community Spotlight',
  'Race Mode Explained', 'Bingo Strategy 101', 'Oldschool Maps Appreciation',
  'New Player Onboarding', 'Competitive DDNet Scene',
]

const FORUM_TOPICS = [
  'Best settings for DDNet?', 'Looking for team members', 'Map suggestion',
  'Found a bug on', 'My first insane map finish!', 'Clan recruitment',
  'Best novice maps for beginners?', 'Random gaming chat', 'Help with freeze maps',
  'Server lag issues', 'Skin customization tips', 'Looking for practice partner',
  'Tournament announcement', 'Map review request', 'Physics question',
  'Controller vs keyboard', 'Favorite DDNet moments', 'Speedrun tips',
  'New player introduction', 'Community event idea',
]

const FORUM_CATEGORIES = ['general', 'help', 'suggestions', 'bugs', 'maps', 'clans', 'offtopic'] as const
const ARTICLE_CATEGORIES = ['news', 'tutorial', 'guide', 'update', 'event', 'announcement'] as const
const TICKET_CATEGORIES = ['name_change', 'bug_report', 'nickname_conflict', 'account_issues', 'game_statistics', 'verification_request', 'other'] as const
const DDNET_CATEGORIES = ['novice', 'moderate', 'brutal', 'insane', 'dummy'] as const

const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa.',
  'Nulla facilisi morbi tempus iaculis urna id volutpat.',
  'Amet cursus sit amet dictum sit amet justo donec.',
  'Vitae turpis massa sed elementum tempus egestas sed sed.',
  'Feugiat pretium nibh ipsum consequat nisl vel pretium lectus.',
  'Viverra accumsan in nisl nisi scelerisque eu ultrices vitae.',
]

const REPLY_TEXTS = [
  'I agree!', 'Great point.', 'Thanks for sharing!',
  'Can you explain more?', 'Not sure about that.',
  '+1', 'This helped me a lot, thanks!',
  'Interesting perspective.', 'I had the same issue.',
  'Totally disagree lol', 'Nice one!', 'GG',
  'Same problem here.', 'Works for me.',
  'Have you tried restarting?', 'Good advice.',
]

// ── Helpers ─────────────────────────────────────────────────────────────────
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
      children: text.split('\n').map((line) => ({
        type: 'paragraph' as const,
        children: [{ type: 'text' as const, text: line, version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        version: 1,
      })),
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

function loremParagraph(sentences = 3): string {
  return pickN(LOREM, sentences).join(' ')
}

function generateNickname(index: number): string {
  if (index < DDNET_PLAYERS.length) return DDNET_PLAYERS[index]
  return `${pick(GENERATED_ADJECTIVES)}${pick(GENERATED_NOUNS)}${randomInt(1, 99)}`
}

// ── Main seed ───────────────────────────────────────────────────────────────
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const payload = await getPayload({ config })
  const log: string[] = []
  const userIds: string[] = []
  const userNicks: string[] = []

  try {
    // =========================================================================
    // 0. Verification Settings
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
    log.push('  5 verification servers')

    // =========================================================================
    // 1. Create 100 Users (1 admin + 2 moderators + 97 players)
    // =========================================================================
    log.push('Creating 100 users...')

    let adminUser: any
    try {
      adminUser = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          username: 'admin',
          ingameNick: 'Admin',
          password: 'admin123',
          roles: 'admin',
          isSystemVerified: true,
          ingameStats: {
            points: 15000, rank: 42,
            skin: { name: 'default', color_body: 65408, color_feet: 10813440 },
            lastSyncedAt: new Date().toISOString(),
          },
          bingo: { totalGamesPlayed: 25, totalGamesWon: 12, winRate: 48 },
        },
      })
    } catch {
      // Admin already exists — find them
      const existing = await payload.find({
        collection: 'users',
        where: { ingameNick: { equals: 'Admin' } },
        limit: 1,
        overrideAccess: true,
      })
      adminUser = existing.docs[0]
      if (!adminUser) {
        // Try by username
        const byUsername = await payload.find({
          collection: 'users',
          where: { username: { equals: 'admin' } },
          limit: 1,
          overrideAccess: true,
        })
        adminUser = byUsername.docs[0]
      }
      log.push('  Admin already exists, reusing')
    }
    userIds.push(adminUser.id)
    userNicks.push('Admin')
    log.push(`  Admin: ${adminUser.id}`)

    for (let i = 0; i < 99; i++) {
      const nick = generateNickname(i)
      try {
        const role = i < 2 ? 'moderator' : 'player'
        const gamesPlayed = randomInt(5, 80)
        const gamesWon = randomInt(1, Math.floor(gamesPlayed * 0.6))
        const skin = pick(SKINS)
        const useColor = Math.random() > 0.4

        const user = await payload.create({
          collection: 'users',
          overrideAccess: true,
          data: {
            username: nick,
            ingameNick: nick,
            password: 'test1234',
            roles: role,
            isSystemVerified: Math.random() > 0.25,
            ingameStats: {
              points: randomInt(100, 30000),
              rank: randomInt(1, 10000),
              skin: {
                name: skin,
                ...(useColor ? {
                  color_body: randomInt(0, 16777215),
                  color_feet: randomInt(0, 16777215),
                } : {}),
              },
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
        userNicks.push(nick)
      } catch {
        // Already exists — find and reuse
        const existing = await payload.find({
          collection: 'users',
          where: { ingameNick: { equals: nick } },
          limit: 1,
          overrideAccess: true,
        })
        if (existing.docs[0]) {
          userIds.push(existing.docs[0].id)
          userNicks.push(nick)
        } else {
          log.push(`  Skipped user #${i} (${nick})`)
        }
      }
    }
    log.push(`  Created ${userIds.length} users`)

    // =========================================================================
    // 2. Friend Relationships (each user gets 3-8 friends)
    // =========================================================================
    log.push('Creating friendships...')
    let friendCount = 0

    for (let i = 0; i < userIds.length; i++) {
      const numFriends = randomInt(3, 8)
      const friendIndices = pickN(
        Array.from({ length: userIds.length }, (_, j) => j).filter((j) => j !== i),
        numFriends,
      )
      const friends = friendIndices.map((j) => ({
        user: userIds[j],
        addedAt: randomDate(90),
      }))

      await payload.update({
        collection: 'users',
        id: userIds[i],
        overrideAccess: true,
        data: { friend: friends },
      })
      friendCount += friends.length
    }
    log.push(`  ${friendCount} friend connections`)

    // =========================================================================
    // 3. 100 Friend Requests
    // =========================================================================
    log.push('Creating 100 friend requests...')
    for (let i = 0; i < 100; i++) {
      const sender = pick(userIds)
      let recipient = pick(userIds)
      while (recipient === sender) recipient = pick(userIds)

      try {
        await payload.create({
          collection: 'friend-requests',
          overrideAccess: true,
          data: {
            sender,
            recipient,
            status: pick(['pending', 'pending', 'pending', 'accepted', 'rejected']),
            message: Math.random() > 0.4
              ? pick(['Hey, wanna play?', 'GG last game!', 'Add me!', 'Lets team up', 'Nice plays earlier'])
              : undefined,
          },
        })
      } catch { /* duplicate pair */ }
    }
    log.push('  100 friend requests')

    // =========================================================================
    // 4. 100 Bingo Games
    // =========================================================================
    log.push('Creating 100 bingo games...')
    const gameStatuses = ['waiting', 'in_progress', 'completed', 'completed', 'completed'] as const

    for (let g = 0; g < 100; g++) {
      const category = pick([...DDNET_CATEGORIES])
      const mode = pick(['solo', 'team'] as const)
      const gridSize = pick(['3x3', '5x5'] as const)
      const gridNum = gridSize === '3x3' ? 9 : 25
      const status = pick([...gameStatuses])
      const mapPool = MAPS_BY_CATEGORY[category] || MAPS_BY_CATEGORY.novice
      const maps = pickN(mapPool, gridNum).map((name, i) => ({ mapName: name, position: i }))

      const teamPlayers1 = pickN(userIds, mode === 'team' ? 2 : 1)
      const remaining = userIds.filter((id) => !teamPlayers1.includes(id))
      const teamPlayers2 = mode === 'team' ? pickN(remaining, 2) : []

      const completedCells1 = status === 'completed' || status === 'in_progress'
        ? pickN(Array.from({ length: gridNum }, (_, i) => i), randomInt(2, Math.min(gridNum, 8)))
          .map((pos) => ({ cellPosition: pos, completedAt: randomDate(3) }))
        : []

      const completedCells2 = mode === 'team' && (status === 'completed' || status === 'in_progress')
        ? pickN(Array.from({ length: gridNum }, (_, i) => i), randomInt(1, Math.min(gridNum, 6)))
          .map((pos) => ({ cellPosition: pos, completedAt: randomDate(3) }))
        : []

      const teams: any[] = [{
        teamName: mode === 'team' ? 'Red Team' : 'Player',
        color: 'red',
        players: teamPlayers1.map((id) => ({ user: id })),
        completedCells: completedCells1,
        teamStatus: status === 'completed' ? 'winner' : status === 'in_progress' ? 'playing' : 'not_ready',
      }]
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
          mode, category, gridSize,
          winCondition: pick(['line', 'cross', 'full_house']),
          isPublic: Math.random() > 0.3,
          difficultyRange: { min: randomInt(0, 2), max: randomInt(3, 5) },
          createdBy: pick(userIds),
          inviteCode: generateInviteCode(),
          maps, teams,
          gameStatus: status,
          startedAt: status !== 'waiting' ? randomDate(14) : undefined,
          completedAt: status === 'completed' ? randomDate(3) : undefined,
          winnerTeam: status === 'completed' && mode === 'team' ? 0 : undefined,
        },
      })
    }
    log.push('  100 bingo games')

    // =========================================================================
    // 5. 100 Races
    // =========================================================================
    log.push('Creating 100 races...')
    const raceStatuses = ['waiting', 'in_progress', 'completed', 'completed'] as const
    const raceTitles = ['Speed Run', 'Best of 5', 'Championship', 'Casual', 'Tryhard', 'Marathon', 'Sprint', 'Showdown']

    for (let r = 0; r < 100; r++) {
      const status = pick([...raceStatuses])
      const players = pickN(userIds, randomInt(2, 4))
      const totalRounds = randomInt(3, 10)
      const currentRound = status === 'completed' ? totalRounds : status === 'in_progress' ? randomInt(1, totalRounds) : 0

      const rounds: any[] = []
      for (let rnd = 1; rnd <= currentRound; rnd++) {
        rounds.push({
          roundNumber: rnd,
          mapName: pick(MAPS_BY_CATEGORY[pick([...DDNET_CATEGORIES])]),
          winner: pick(players),
          finishTime: randomInt(30, 600),
          completedAt: randomDate(7),
        })
      }

      await payload.create({
        collection: 'races',
        overrideAccess: true,
        data: {
          title: `Race #${r + 1} - ${pick(raceTitles)}`,
          isPublic: Math.random() > 0.3,
          inviteCode: generateInviteCode(),
          category: pick(['novice', 'moderate', 'brutal']),
          totalRounds, currentRound,
          currentMap: status === 'in_progress' ? pick(MAPS_BY_CATEGORY.novice) : undefined,
          server: { ip: '74.91.116.114', port: 8303, name: 'DDNet USA (Test)' },
          players: players.map((id, i) => ({
            user: id,
            ingameNick: userNicks[userIds.indexOf(id)] || `Player${i}`,
            roundsWon: rounds.filter((rd: any) => rd.winner === id).length,
            isReady: status !== 'waiting' || Math.random() > 0.5,
          })),
          rounds,
          winner: status === 'completed' ? pick(players) : undefined,
          status,
          createdBy: players[0],
          startedAt: status !== 'waiting' ? randomDate(10) : undefined,
          completedAt: status === 'completed' ? randomDate(3) : undefined,
        },
      })
    }
    log.push('  100 races')

    // =========================================================================
    // 6. 100 Articles
    // =========================================================================
    log.push('Creating 100 articles...')
    for (let a = 0; a < 100; a++) {
      const topic = pick(ARTICLE_TOPICS)
      const title = `${topic} #${a + 1}`
      await payload.create({
        collection: 'articles',
        overrideAccess: true,
        draft: false,
        data: {
          title,
          slug: slugify(title) + '-' + randomInt(1000, 9999),
          excerpt: `An exciting article about ${topic.toLowerCase()}.`,
          content: richText(loremParagraph(5)),
          author: pick(userIds),
          category: pick([...ARTICLE_CATEGORIES]),
          tags: pickN(['ddnet', 'bingo', 'race', 'maps', 'tips', 'community', 'tournament', 'guide', 'news', 'event'], randomInt(1, 4)).map((t) => ({ tag: t })),
          featured: Math.random() > 0.85,
          views: randomInt(10, 10000),
          likes: randomInt(0, 500),
          _status: 'published',
        },
      })
    }
    log.push('  100 articles')

    // =========================================================================
    // 7. 100 Forum Posts
    // =========================================================================
    log.push('Creating 100 forum posts...')
    for (let f = 0; f < 100; f++) {
      const topic = pick(FORUM_TOPICS)
      const title = `${topic} #${f + 1}`
      const numReplies = randomInt(0, 8)
      const replies = Array.from({ length: numReplies }, () => ({
        author: pick(userIds),
        content: richText(pick(REPLY_TEXTS)),
        createdAt: randomDate(14),
        likes: randomInt(0, 30),
      }))

      await payload.create({
        collection: 'forum-posts',
        overrideAccess: true,
        data: {
          title,
          slug: slugify(title) + '-' + randomInt(1000, 9999),
          content: richText(`${topic}\n\n${loremParagraph(3)}`),
          author: pick(userIds),
          category: pick([...FORUM_CATEGORIES]),
          status: 'published',
          isPinned: Math.random() > 0.9,
          views: randomInt(5, 3000),
          likes: randomInt(0, 100),
          replies,
        },
      })
    }
    log.push('  100 forum posts')

    // =========================================================================
    // 8. 100 Notifications
    // =========================================================================
    log.push('Creating 100 notifications...')
    const notifTypes = [
      'game_invite', 'friend_request', 'friend_accepted',
      'game_started', 'game_ended', 'system',
    ] as const
    const notifMessages: Record<string, string[]> = {
      game_invite: ['invited you to a Bingo game', 'wants you to join a Race', 'created a new game lobby'],
      friend_request: ['sent you a friend request', 'wants to be your friend'],
      friend_accepted: ['accepted your friend request', 'is now your friend'],
      game_started: ['Your bingo game has started!', 'Race is starting now!', 'Game lobby is ready'],
      game_ended: ['Game over! Check results.', 'The race has ended.', 'Bingo game completed!'],
      system: ['Welcome to DDNet Bingo!', 'Server maintenance scheduled.', 'New maps available!', 'Your stats have been updated.'],
    }

    for (let n = 0; n < 100; n++) {
      const type = pick([...notifTypes])
      await payload.create({
        collection: 'notifications',
        overrideAccess: true,
        data: {
          recipient: pick(userIds),
          type,
          title: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          message: pick(notifMessages[type]),
          isRead: Math.random() > 0.5,
          actionUrl: pick(['/app/bingo', '/app/race', '/app/friends', '/app/dashboard', '/app/leaderboard']),
          relatedUser: Math.random() > 0.5 ? pick(userIds) : undefined,
        },
      })
    }
    log.push('  100 notifications')

    // =========================================================================
    // 9. 100 Support Tickets
    // =========================================================================
    log.push('Creating 100 support tickets...')
    const ticketSubjects = [
      'Name change request', 'Cannot verify my nickname', 'Stats not updating',
      'Someone stole my nickname', 'Login issues after update', 'Bug in bingo grid',
      'Race timer is wrong', 'Cannot add friends', 'Skin not loading',
      'Map missing from category', 'Points not counted', 'Account recovery',
      'Report a cheater', 'Server connection issues', 'Feature suggestion',
    ]

    for (let t = 0; t < 100; t++) {
      const subject = `${pick(ticketSubjects)} #${t + 1}`
      await payload.create({
        collection: 'support',
        overrideAccess: true,
        data: {
          subject,
          category: pick([...TICKET_CATEGORIES]),
          priority: pick(['low', 'medium', 'medium', 'high', 'critical']),
          status: pick(['open', 'open', 'in_progress', 'resolved', 'waiting_for_user', 'closed']),
          description: richText(`I need help with: ${subject}.\n\n${loremParagraph(2)}`),
          createdBy: pick(userIds),
          responses: Math.random() > 0.5 ? [{
            message: richText('Thank you for reaching out. We are looking into this.'),
            author: adminUser.id,
            isStaffResponse: true,
            timestamp: randomDate(5),
          }] : [],
        },
      })
    }
    log.push('  100 support tickets')

    // =========================================================================
    // 10. 100 Conversations + Messages
    // =========================================================================
    log.push('Creating 100 conversations with messages...')
    for (let c = 0; c < 100; c++) {
      const pair = pickN(userIds, 2)
      try {
        const convo = await payload.create({
          collection: 'conversations',
          overrideAccess: true,
          data: {
            participants: pair.map((id) => ({ user: id })),
            lastMessage: 'Hey!',
            lastMessageAt: randomDate(7),
            lastMessageBy: pair[0],
          },
        })

        const msgCount = randomInt(2, 10)
        for (let m = 0; m < msgCount; m++) {
          const sender = pick(pair)
          const content = pick([
            'Hey!', 'Wanna play?', 'GG', 'Nice run!', 'What map?',
            'Im down', 'Lets go', 'One more?', 'brb', 'lol',
            'That was close', 'How did you do that?', 'Teach me',
            'See you later', 'Good game!',
          ])
          await payload.create({
            collection: 'messages',
            overrideAccess: true,
            data: {
              conversation: convo.id,
              sender,
              content,
              isRead: Math.random() > 0.3,
            },
          })
        }
      } catch { /* duplicate pair */ }
    }
    log.push('  100 conversations')

    // =========================================================================
    // Done
    // =========================================================================
    log.push('')
    log.push('Seed complete!')
    log.push(`  Users: ${userIds.length}`)
    log.push(`  Admin login: admin / admin123`)
    log.push(`  Moderator login: ${userNicks[1]} / test1234`)
    log.push(`  Player login: (any nick) / test1234`)

    return NextResponse.json({ success: true, log })
  } catch (error: unknown) {
    console.error('[Seed] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seed failed', log },
      { status: 500 },
    )
  }
}
