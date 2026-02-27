import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getBotManager } from '@/services/verification/BotManager'
import { findPlayerOnline } from '@/lib/ddnet-helpers'

/**
 * POST — Start a nickname claim (force steal).
 * No auth required — the claimant doesn't have an account yet.
 *
 * Flow:
 * 1. Check that an UNVERIFIED user exists with this ingameNick
 *    (if verified — the real owner already proved identity, no claim needed)
 * 2. Check that the claimant is online on a verification server
 * 3. Create a VerificationRequest with mode: 'claim'
 * 4. Start the verification bot — if confirmed, delete the impostor account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingameNick } = body as { ingameNick: string }

    if (!ingameNick || typeof ingameNick !== 'string' || ingameNick.trim().length === 0) {
      return NextResponse.json(
        { error: 'ingameNick is required' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: payloadConfig })

    // Check if verification bot is enabled
    const botSettings = await payload.findGlobal({ slug: 'bot-settings' })
    if (!botSettings.verificationBotEnabled) {
      return NextResponse.json(
        { error: 'bot_disabled', message: 'Verification is temporarily disabled. Please contact an admin via ticket.' },
        { status: 503 },
      )
    }

    // Check if a user exists with this nickname
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        ingameNick: { equals: ingameNick },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existingUsers.docs.length === 0) {
      return NextResponse.json(
        { error: 'no_account', message: 'No account exists with this nickname. You can register freely.' },
        { status: 400 },
      )
    }

    const existingUser = existingUsers.docs[0]

    if (existingUser.isSystemVerified) {
      return NextResponse.json(
        {
          error: 'already_verified',
          message: 'This account is already verified by its owner. If you believe this is an error, contact support.',
        },
        { status: 400 },
      )
    }

    // Load verification servers
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

    // Check if the claimant is online on a verification server
    const onlineStatus = await findPlayerOnline(ingameNick)

    if (!onlineStatus.online || !onlineStatus.server) {
      return NextResponse.json(
        {
          error: 'offline',
          message: 'Player is not online. Please join a verification server first.',
          verificationServers: settings.servers.map((s) => ({
            name: s.name,
            ip: s.ip,
            port: s.port,
            region: s.region || null,
          })),
        },
        { status: 400 },
      )
    }

    const playerIp = onlineStatus.server.ip
    const playerPort = onlineStatus.server.port
    const matchedServer = settings.servers.find(
      (s) => s.ip === playerIp && s.port === playerPort,
    )

    if (!matchedServer) {
      return NextResponse.json(
        {
          error: 'wrong_server',
          message: 'You are on the wrong server. Please join a verification server.',
          playerServer: onlineStatus.server,
          verificationServers: settings.servers.map((s) => ({
            name: s.name,
            ip: s.ip,
            port: s.port,
            region: s.region || null,
          })),
        },
        { status: 400 },
      )
    }

    // Check bot availability
    const botManager = getBotManager()
    if (!botManager.hasAvailableSlots()) {
      return NextResponse.json(
        { error: 'All verification slots are currently in use. Please try again later.' },
        { status: 503 },
      )
    }

    // Cancel any existing pending claim requests for this nickname
    const existingClaims = await payload.find({
      collection: 'verification-requests',
      where: {
        and: [
          { claimNick: { equals: ingameNick } },
          { mode: { equals: 'claim' } },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 10,
      overrideAccess: true,
    })

    for (const req of existingClaims.docs) {
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
        data: { status: 'expired', message: 'Cancelled by new claim request' },
        overrideAccess: true,
      })
    }

    // Create verification request with mode: 'claim'
    const verificationRequest = await (payload.create as any)({
      collection: 'verification-requests',
      data: {
        nickname: ingameNick,
        mode: 'claim',
        status: 'pending',
        claimNick: ingameNick,
        currentServer: `${matchedServer.ip}:${matchedServer.port}`,
      },
      overrideAccess: true,
    })

    // Start bot
    try {
      const containerId = await botManager.startVerification(
        ingameNick,
        verificationRequest.id,
        matchedServer.ip,
        matchedServer.port,
        botLoginToken,
      )

      await payload.update({
        collection: 'verification-requests',
        id: verificationRequest.id,
        data: { containerId },
        overrideAccess: true,
      })
    } catch (botError) {
      await payload.update({
        collection: 'verification-requests',
        id: verificationRequest.id,
        data: { status: 'failed', message: 'Bot failed to start' },
        overrideAccess: true,
      })
      throw botError
    }

    return NextResponse.json({
      claimId: verificationRequest.id,
      status: 'pending',
    })
  } catch (error) {
    console.error('[Claim] Start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
