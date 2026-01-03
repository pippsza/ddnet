import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getBotManager } from '@/services/verification/BotManager'
import { generateVerificationToken } from '@/services/bot/tokenGenerator'
import { auth } from '@/lib/auth'
import type { ServerInfo } from '@/services/verification/types'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const body = await request.json()
    const { nickname } = body

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 })
    }

    if (nickname.length < 2 || nickname.length > 16) {
      return NextResponse.json(
        { error: 'Nickname must be between 2 and 16 characters' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: payloadConfig })

    // Check if user already has pending/active verification
    const existingRequest = await payload.find({
      collection: 'verification-requests',
      where: {
        and: [
          { user: { equals: userId } },
          { status: { in: ['pending', 'active'] } },
          { expiresAt: { greater_than: new Date().toISOString() } },
        ],
      },
      limit: 1,
    })

    if (existingRequest.docs.length > 0) {
      const existing = existingRequest.docs[0]
      return NextResponse.json(
        {
          error: 'You already have an active verification request',
          requestId: existing.id,
          token: existing.token,
          status: existing.status,
        },
        { status: 409 },
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

    // Get active servers for bot
    const serversResult = await payload.find({
      collection: 'servers',
      where: { isActive: { equals: true } },
      limit: 100,
    })

    const servers: ServerInfo[] = serversResult.docs.map((s) => ({
      ip: s.ip,
      port: s.port,
      name: s.name,
    }))

    if (servers.length === 0) {
      return NextResponse.json(
        { error: 'No verification servers configured. Please contact support.' },
        { status: 503 },
      )
    }

    const token = generateVerificationToken()

    // Create verification request
    const verificationRequest = await payload.create({
      collection: 'verification-requests',
      data: {
        nickname,
        token,
        status: 'pending',
        user: userId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    })

    // Start bot container
    try {
      const containerId = await botManager.startVerification(
        nickname,
        token,
        verificationRequest.id,
        servers,
      )

      // Update request with container ID
      await payload.update({
        collection: 'verification-requests',
        id: verificationRequest.id,
        data: { containerId },
      })
    } catch (botError) {
      // If bot fails to start, mark request as failed
      await payload.update({
        collection: 'verification-requests',
        id: verificationRequest.id,
        data: { status: 'failed' },
      })
      throw botError
    }

    return NextResponse.json({
      requestId: verificationRequest.id,
      token,
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
