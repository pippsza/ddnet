import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
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
      if (verificationRequest.status !== 'expired') {
        await payload.update({
          collection: 'verification-requests',
          id: requestId,
          data: { status: 'expired' },
        })
      }
      return NextResponse.json({
        status: 'expired',
        message: 'Verification request has expired',
      })
    }

    return NextResponse.json({
      status: verificationRequest.status,
      currentServer: verificationRequest.currentServer || null,
      expiresAt: verificationRequest.expiresAt,
    })
  } catch (error) {
    console.error('Verification status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
