import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

/**
 * POST — Poll claim status.
 * No auth required — the claimant doesn't have an account yet.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { claimId } = body as { claimId: string }

    if (!claimId) {
      return NextResponse.json({ error: 'claimId is required' }, { status: 400 })
    }

    const payload = await getPayload({ config: payloadConfig })

    const verificationRequest = await payload.findByID({
      collection: 'verification-requests',
      id: claimId,
      overrideAccess: true,
    })

    if (!verificationRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (verificationRequest.mode !== 'claim') {
      return NextResponse.json({ error: 'Not a claim request' }, { status: 400 })
    }

    // Check expiration
    if (new Date(verificationRequest.expiresAt) < new Date()) {
      if (verificationRequest.status !== 'expired') {
        await payload.update({
          collection: 'verification-requests',
          id: claimId,
          data: { status: 'expired' },
          overrideAccess: true,
        })
      }
      return NextResponse.json({
        status: 'expired',
        message: 'Claim request has expired',
      })
    }

    return NextResponse.json({
      status: verificationRequest.status,
      message: verificationRequest.message || null,
      currentServer: verificationRequest.currentServer || null,
      expiresAt: verificationRequest.expiresAt,
    })
  } catch (error) {
    console.error('[Claim] Status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
