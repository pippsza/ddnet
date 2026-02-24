import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPage } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'stats')
    if (result instanceof NextResponse) return result
    const { payload } = result

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // Run all queries in parallel
    const [
      usersTotal,
      usersVerified,
      usersAdmin,
      allRoles,
      recentUsers,
      bingoTotal,
      bingoWaiting,
      bingoInProgress,
      bingoCompleted,
      bingoCancelled,
      bingoSolo,
      bingoTeam,
      racesTotal,
      racesInProgress,
      racesCompleted,
      recentBingo,
      recentRaces,
      articlesTotal,
      articlesPublished,
      allArticles,
      forumTotal,
      allForumPosts,
      friendReqTotal,
      friendReqPending,
      friendReqAccepted,
      friendReqRejected,
      conversationsTotal,
      messagesTotal,
      supportTotal,
      supportOpen,
      supportInProgress,
      supportResolved,
      supportClosed,
      supportLow,
      supportMedium,
      supportHigh,
      supportCritical,
      notificationsTotal,
      notificationsUnread,
      pushSubsTotal,
      verifyReqTotal,
      verifyReqPending,
      verifyReqSuccess,
      verifyReqFailed,
      mediaTotal,
      botsRunning,
      botsStopped,
    ] = await Promise.all([
      // Users
      payload.count({ collection: 'users' }),
      payload.count({ collection: 'users', where: { isSystemVerified: { equals: true } } }),
      payload.count({ collection: 'users', where: { roles: { equals: 'admin' } } }),
      payload.find({ collection: 'roles', limit: 100, depth: 0 }),
      payload.find({
        collection: 'users',
        where: { createdAt: { greater_than: thirtyDaysAgoISO } },
        limit: 0,
        select: { createdAt: true },
      }),

      // Bingo
      payload.count({ collection: 'bingo' }),
      payload.count({ collection: 'bingo', where: { gameStatus: { equals: 'waiting' } } }),
      payload.count({ collection: 'bingo', where: { gameStatus: { equals: 'in_progress' } } }),
      payload.count({ collection: 'bingo', where: { gameStatus: { equals: 'completed' } } }),
      payload.count({ collection: 'bingo', where: { gameStatus: { equals: 'cancelled' } } }),
      payload.count({ collection: 'bingo', where: { mode: { equals: 'solo' } } }),
      payload.count({ collection: 'bingo', where: { mode: { equals: 'team' } } }),

      // Races
      payload.count({ collection: 'races' }),
      payload.count({ collection: 'races', where: { status: { equals: 'in_progress' } } }),
      payload.count({ collection: 'races', where: { status: { equals: 'completed' } } }),

      // Recent games (30 days)
      payload.find({
        collection: 'bingo',
        where: { createdAt: { greater_than: thirtyDaysAgoISO } },
        limit: 0,
        select: { createdAt: true },
      }),
      payload.find({
        collection: 'races',
        where: { createdAt: { greater_than: thirtyDaysAgoISO } },
        limit: 0,
        select: { createdAt: true },
      }),

      // Articles
      payload.count({ collection: 'articles' }),
      payload.count({ collection: 'articles', where: { _status: { equals: 'published' } } }),
      payload.find({
        collection: 'articles',
        limit: 500,
        select: { views: true, likes: true, category: true },
      }),

      // Forum
      payload.count({ collection: 'forum-posts' }),
      payload.find({
        collection: 'forum-posts',
        limit: 500,
        select: { views: true, likes: true, category: true, replies: true },
      }),

      // Friend Requests
      payload.count({ collection: 'friend-requests' }),
      payload.count({ collection: 'friend-requests', where: { status: { equals: 'pending' } } }),
      payload.count({ collection: 'friend-requests', where: { status: { equals: 'accepted' } } }),
      payload.count({ collection: 'friend-requests', where: { status: { equals: 'rejected' } } }),

      // Conversations & Messages
      payload.count({ collection: 'conversations' }),
      payload.count({ collection: 'messages' }),

      // Support
      payload.count({ collection: 'support' }),
      payload.count({ collection: 'support', where: { status: { equals: 'open' } } }),
      payload.count({ collection: 'support', where: { status: { equals: 'in_progress' } } }),
      payload.count({ collection: 'support', where: { status: { equals: 'resolved' } } }),
      payload.count({ collection: 'support', where: { status: { equals: 'closed' } } }),
      payload.count({ collection: 'support', where: { priority: { equals: 'low' } } }),
      payload.count({ collection: 'support', where: { priority: { equals: 'medium' } } }),
      payload.count({ collection: 'support', where: { priority: { equals: 'high' } } }),
      payload.count({ collection: 'support', where: { priority: { equals: 'critical' } } }),

      // System
      payload.count({ collection: 'notifications' }),
      payload.count({ collection: 'notifications', where: { isRead: { equals: false } } }),
      payload.count({ collection: 'push-subscriptions' }),
      payload.count({ collection: 'verification-requests' }),
      payload.count({
        collection: 'verification-requests',
        where: { status: { equals: 'pending' } },
      }),
      payload.count({
        collection: 'verification-requests',
        where: { status: { equals: 'success' } },
      }),
      payload.count({
        collection: 'verification-requests',
        where: { status: { equals: 'failed' } },
      }),
      payload.count({ collection: 'media' }),
      payload.count({ collection: 'bots', where: { status: { equals: 'running' } } }),
      payload.count({ collection: 'bots', where: { status: { equals: 'stopped' } } }),
    ])

    // Aggregate recent registrations by day
    const recentRegistrations = aggregateByDay(
      recentUsers.docs.map((u) => u.createdAt as string),
      30,
    )
    const recentBingoByDay = aggregateByDay(
      recentBingo.docs.map((g) => g.createdAt as string),
      30,
    )
    const recentRacesByDay = aggregateByDay(
      recentRaces.docs.map((g) => g.createdAt as string),
      30,
    )

    // Merge timeline
    const timeline = recentRegistrations.map((entry, i) => ({
      date: entry.date,
      users: entry.count,
      bingo: recentBingoByDay[i]?.count || 0,
      races: recentRacesByDay[i]?.count || 0,
    }))

    // Article aggregations
    const articleViews = allArticles.docs.reduce(
      (sum, a) => sum + ((a.views as number) || 0),
      0,
    )
    const articleLikes = allArticles.docs.reduce(
      (sum, a) => sum + ((a.likes as number) || 0),
      0,
    )
    const articlesByCategory: Record<string, number> = {}
    for (const a of allArticles.docs) {
      const cat = (a.category as string) || 'uncategorized'
      articlesByCategory[cat] = (articlesByCategory[cat] || 0) + 1
    }

    // Forum aggregations
    const forumViews = allForumPosts.docs.reduce(
      (sum, p) => sum + ((p.views as number) || 0),
      0,
    )
    const forumReplies = allForumPosts.docs.reduce(
      (sum, p) => sum + (Array.isArray(p.replies) ? p.replies.length : 0),
      0,
    )
    const forumByCategory: Record<string, number> = {}
    for (const p of allForumPosts.docs) {
      const cat = (p.category as string) || 'general'
      forumByCategory[cat] = (forumByCategory[cat] || 0) + 1
    }

    const roleNames: Record<string, string> = { admin: 'Admin' }
    for (const role of allRoles.docs) {
      roleNames[(role as any).name] = (role as any).displayName || (role as any).name
    }
    const playersCount = usersTotal.totalDocs - usersAdmin.totalDocs
    const totalRoles = allRoles.totalDocs

    return NextResponse.json({
      users: {
        total: usersTotal.totalDocs,
        verified: usersVerified.totalDocs,
        unverified: usersTotal.totalDocs - usersVerified.totalDocs,
        byRole: {
          admin: usersAdmin.totalDocs,
          player: playersCount,
        },
        totalDynamicRoles: totalRoles,
        recentRegistrations,
      },
      games: {
        bingo: {
          total: bingoTotal.totalDocs,
          byStatus: {
            waiting: bingoWaiting.totalDocs,
            in_progress: bingoInProgress.totalDocs,
            completed: bingoCompleted.totalDocs,
            cancelled: bingoCancelled.totalDocs,
          },
          byMode: { solo: bingoSolo.totalDocs, team: bingoTeam.totalDocs },
        },
        races: {
          total: racesTotal.totalDocs,
          byStatus: {
            in_progress: racesInProgress.totalDocs,
            completed: racesCompleted.totalDocs,
            other: racesTotal.totalDocs - racesInProgress.totalDocs - racesCompleted.totalDocs,
          },
        },
        timeline,
      },
      content: {
        articles: {
          total: articlesTotal.totalDocs,
          published: articlesPublished.totalDocs,
          draft: articlesTotal.totalDocs - articlesPublished.totalDocs,
          totalViews: articleViews,
          totalLikes: articleLikes,
          byCategory: articlesByCategory,
        },
        forumPosts: {
          total: forumTotal.totalDocs,
          totalViews: forumViews,
          totalReplies: forumReplies,
          byCategory: forumByCategory,
        },
      },
      social: {
        friendRequests: {
          total: friendReqTotal.totalDocs,
          pending: friendReqPending.totalDocs,
          accepted: friendReqAccepted.totalDocs,
          rejected: friendReqRejected.totalDocs,
        },
        conversations: conversationsTotal.totalDocs,
        messages: messagesTotal.totalDocs,
      },
      support: {
        total: supportTotal.totalDocs,
        byStatus: {
          open: supportOpen.totalDocs,
          in_progress: supportInProgress.totalDocs,
          resolved: supportResolved.totalDocs,
          closed: supportClosed.totalDocs,
        },
        byPriority: {
          low: supportLow.totalDocs,
          medium: supportMedium.totalDocs,
          high: supportHigh.totalDocs,
          critical: supportCritical.totalDocs,
        },
      },
      system: {
        notifications: {
          total: notificationsTotal.totalDocs,
          unread: notificationsUnread.totalDocs,
        },
        pushSubscriptions: pushSubsTotal.totalDocs,
        verificationRequests: {
          total: verifyReqTotal.totalDocs,
          pending: verifyReqPending.totalDocs,
          success: verifyReqSuccess.totalDocs,
          failed: verifyReqFailed.totalDocs,
        },
        media: mediaTotal.totalDocs,
        bots: {
          running: botsRunning.totalDocs,
          stopped: botsStopped.totalDocs,
        },
      },
    })
  } catch (error) {
    console.error('[API] Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function aggregateByDay(dates: string[], days: number): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, count: 0 })
  }

  for (const dateStr of dates) {
    if (!dateStr) continue
    const day = dateStr.split('T')[0]
    const entry = result.find((r) => r.date === day)
    if (entry) entry.count++
  }

  return result
}
