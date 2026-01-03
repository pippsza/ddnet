import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    // Verify bot secret
    const botSecret = request.headers.get('X-Bot-Secret')
    if (botSecret !== process.env.BACKEND_SECRET) {
      console.warn('[Bot Callback] Invalid or missing X-Bot-Secret header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, nickname, serverIp, serverPort, found } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const payload = await getPayload({ config: payloadConfig })

    const verificationRequest = await payload.findByID({
      collection: 'verification-requests',
      id: requestId,
    })

    if (!verificationRequest) {
      console.warn(`[Bot Callback] Request not found: ${requestId}`)
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Don't update if already completed
    if (['success', 'expired'].includes(verificationRequest.status)) {
      return NextResponse.json({
        success: true,
        message: 'Request already completed',
      })
    }

    if (found) {
      // Bot found the player - update status to active
      await payload.update({
        collection: 'verification-requests',
        id: requestId,
        data: {
          status: 'active',
          currentServer: `${serverIp}:${serverPort}`,
        },
      })
      console.log(`[Bot Callback] Player ${nickname} found on ${serverIp}:${serverPort}`)
    } else {
      // Bot couldn't find player on any server
      await payload.update({
        collection: 'verification-requests',
        id: requestId,
        data: { status: 'failed' },
      })
      console.log(`[Bot Callback] Player ${nickname} not found on any server`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bot callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
