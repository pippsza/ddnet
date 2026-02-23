import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getBotManager } from '@/services/verification/BotManager'
import { auth } from '@/lib/auth'
import { findPlayerOnline } from '@/lib/ddnet-helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const payload = await getPayload({ config: payloadConfig })

    // Get the user's ingame nick from their profile
    const user = await payload.findByID({ collection: 'users', id: userId })
    const nickname = user.ingameNick

    if (!nickname) {
      return NextResponse.json(
        { error: 'No in-game nickname set on your profile.' },
        { status: 400 },
      )
    }

    // Load verification settings from global
    const settings = await payload.findGlobal({ slug: 'verification-settings' })

    if (!settings.servers || settings.servers.length === 0) {
      return NextResponse.json(
        { error: 'No verification servers configured. Please contact support.' },
        { status: 503 },
      )
    }

    const botLoginToken = process.env.BOT_LOGIN_TOKEN
    if (!botLoginToken) {
      return NextResponse.json(
        { error: 'Bot login token not configured. Please contact support.' },
        { status: 503 },
      )
    }

    // Cancel any existing pending verification requests
    const existingRequests = await payload.find({
      collection: 'verification-requests',
      where: {
        and: [
          { user: { equals: userId } },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 10,
    })

    const botManager = getBotManager()

    for (const req of existingRequests.docs) {
      if (req.containerId) {
        try {
          await botManager.stopBot(req.containerId)
        } catch {
          // Container may already be stopped
        }
      }
      await payload.update({
        collection: 'verification-requests',
        id: req.id,
        data: { status: 'expired', message: 'Cancelled by new request' },
      })
    }

    // Check where the player is online via DDNet Master API
    const onlineStatus = await findPlayerOnline(nickname)

    if (!onlineStatus.online || !onlineStatus.server) {
      return NextResponse.json(
        {
          error: 'offline',
          message: 'Player is not online. Please join a verification server first.',
          verificationServers: settings.servers,
        },
        { status: 400 },
      )
    }

    // Check if the player is on one of the verification servers
    const playerIp = onlineStatus.server.ip
    const playerPort = onlineStatus.server.port
    const matchedServer = settings.servers.find(
      (s) => s.ip === playerIp && s.port === playerPort,
    )

    if (!matchedServer) {
      return NextResponse.json(
        {
          error: 'wrong_server',
          message: 'You are on the wrong server.',
          playerServer: onlineStatus.server,
          verificationServers: settings.servers,
        },
        { status: 400 },
      )
    }

    // Check bot availability
    if (!botManager.hasAvailableSlots()) {
      return NextResponse.json(
        { error: 'All verification slots are currently in use. Please try again later.' },
        { status: 503 },
      )
    }

    // Create verification request
    const verificationRequest = await (payload.create as any)({
      collection: 'verification-requests',
      data: {
        nickname,
        status: 'pending',
        user: userId,
        currentServer: `${matchedServer.ip}:${matchedServer.port}`,
      },
    })

    // Start bot container
    try {
      const containerId = await botManager.startVerification(
        nickname,
        verificationRequest.id,
        matchedServer.ip,
        matchedServer.port,
        botLoginToken,
      )

      await payload.update({
        collection: 'verification-requests',
        id: verificationRequest.id,
        data: { containerId },
      })
    } catch (botError) {
      await payload.update({
        collection: 'verification-requests',
        id: verificationRequest.id,
        data: { status: 'failed', message: 'Bot failed to start' },
      })
      throw botError
    }

    return NextResponse.json({
      requestId: verificationRequest.id,
      status: 'pending',
    })
  } catch (error) {
    console.error('Verification start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
