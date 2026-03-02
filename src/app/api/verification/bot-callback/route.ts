import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { timingSafeEqual } from 'crypto'
import type { BotCallbackResult } from '@/services/verification/types'

export async function POST(request: NextRequest) {
  try {
    // Verify bot secret (timing-safe comparison)
    const botSecret = request.headers.get('X-Bot-Secret') || ''
    const expected = process.env.BACKEND_SECRET || ''
    const isValid =
      botSecret.length > 0 &&
      botSecret.length === expected.length &&
      timingSafeEqual(Buffer.from(botSecret), Buffer.from(expected))
    if (!isValid) {
      console.warn('[Bot Callback] Invalid or missing X-Bot-Secret header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, nickname, serverIp, serverPort, result, message } = body as {
      requestId: string
      nickname: string
      serverIp: string
      serverPort: number
      result: BotCallbackResult
      message?: string
    }

    if (!requestId || !result) {
      return NextResponse.json({ error: 'Request ID and result are required' }, { status: 400 })
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
      return NextResponse.json({ success: true, message: 'Request already completed' })
    }

    const serverStr = serverIp ? `${serverIp}:${serverPort}` : undefined

    switch (result) {
      case 'verified': {
        if (verificationRequest.mode === 'claim') {
          // Claim mode: delete the existing user with this nickname
          const claimNick = verificationRequest.claimNick || verificationRequest.nickname
          const existingUsers = await payload.find({
            collection: 'users',
            where: { ingameNick: { equals: claimNick } },
            limit: 1,
            overrideAccess: true,
          })

          if (existingUsers.docs.length > 0) {
            await payload.delete({
              collection: 'users',
              id: existingUsers.docs[0].id,
              overrideAccess: true,
            })
            console.log(`[Bot Callback] Claim: deleted user with nick "${claimNick}"`)
          }

          await payload.update({
            collection: 'verification-requests',
            id: requestId,
            data: {
              status: 'success',
              currentServer: serverStr,
            },
          })

          console.log(`[Bot Callback] Claim: player ${nickname} VERIFIED on ${serverStr}, account freed`)
        } else {
          // Normal verify mode: mark user as verified
          const userId =
            typeof verificationRequest.user === 'string'
              ? verificationRequest.user
              : (verificationRequest.user as { id: string })?.id

          if (userId) {
            await payload.update({
              collection: 'users',
              id: userId,
              data: { isSystemVerified: true },
            })
          }

          await payload.update({
            collection: 'verification-requests',
            id: requestId,
            data: {
              status: 'success',
              currentServer: serverStr,
            },
          })

          console.log(`[Bot Callback] Player ${nickname} VERIFIED on ${serverStr}`)
        }
        break
      }

      case 'hidden': {
        await payload.update({
          collection: 'verification-requests',
          id: requestId,
          data: {
            status: 'failed',
            message: 'not_logged_in',
            currentServer: serverStr,
          },
        })
        console.log(`[Bot Callback] Player ${nickname} is HIDDEN (not logged in) on ${serverStr}`)
        break
      }

      case 'not_found': {
        await payload.update({
          collection: 'verification-requests',
          id: requestId,
          data: {
            status: 'failed',
            message: 'not_found',
          },
        })
        console.log(`[Bot Callback] Player ${nickname} not found on server`)
        break
      }

      case 'error': {
        await payload.update({
          collection: 'verification-requests',
          id: requestId,
          data: {
            status: 'failed',
            message: message || 'unknown_error',
          },
        })
        console.log(`[Bot Callback] Error for ${nickname}: ${message}`)
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bot callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
