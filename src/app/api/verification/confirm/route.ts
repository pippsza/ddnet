import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { getBotManager } from '@/services/verification/BotManager'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, token } = body

    if (!requestId || !token) {
      return NextResponse.json({ error: 'Request ID and token are required' }, { status: 400 })
    }

    const payload = await getPayload({ config: payloadConfig })

    const verificationRequest = await payload.findByID({
      collection: 'verification-requests',
      id: requestId,
    })

    if (!verificationRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check ownership
    const userId =
      typeof verificationRequest.user === 'string'
        ? verificationRequest.user
        : verificationRequest.user.id

    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check expiration
    if (new Date(verificationRequest.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Verification request has expired' }, { status: 400 })
    }

    // Check status is 'active' (bot found player)
    if (verificationRequest.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Verification not ready. Bot must find you in-game first.',
          currentStatus: verificationRequest.status,
        },
        { status: 400 },
      )
    }

    // Verify token
    if (verificationRequest.token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Success! Update user as verified
    await payload.update({
      collection: 'users',
      id: session.user.id,
      data: {
        isSystemVerified: true,
      },
    })

    // Update verification request status
    await payload.update({
      collection: 'verification-requests',
      id: requestId,
      data: { status: 'success' },
    })

    // Stop the bot container if still running
    if (verificationRequest.containerId) {
      const botManager = getBotManager()
      await botManager.stopVerification(verificationRequest.containerId)
    }

    return NextResponse.json({
      success: true,
      message: 'Nickname verified successfully',
    })
  } catch (error) {
    console.error('Verification confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
