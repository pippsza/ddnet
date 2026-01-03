import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { generateVerificationToken } from '@/services/bot/tokenGenerator'
import { getBotManager } from '@/services/verification/BotManager'
import type { ServerInfo } from '@/services/verification/types'

/**
 * Password Reset Flow:
 * 1. User submits nickname
 * 2. System starts bot verification (same as regular verification)
 * 3. User confirms token from bot
 * 4. User can set new password
 *
 * This ensures only the actual nickname owner can reset the password
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nickname, action, requestId, token, newPassword } = body

    const payload = await getPayload({ config: payloadConfig })

    // Step 1: Start password reset - initiate verification
    if (action === 'start') {
      if (!nickname || typeof nickname !== 'string') {
        return NextResponse.json({ error: 'Nickname is required' }, { status: 400 })
      }

      if (nickname.length < 2 || nickname.length > 16) {
        return NextResponse.json(
          { error: 'Nickname must be between 2 and 16 characters' },
          { status: 400 },
        )
      }

      // Find user by nickname
      const users = await payload.find({
        collection: 'users',
        where: { name: { equals: nickname } },
        limit: 1,
      })

      if (users.docs.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const user = users.docs[0]

      // Check for existing pending reset verification
      const existingRequest = await payload.find({
        collection: 'verification-requests',
        where: {
          and: [
            { nickname: { equals: nickname } },
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

      // Get active servers
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

      const verificationToken = generateVerificationToken()

      // Create verification request (with user reference for password reset)
      const verificationRequest = await payload.create({
        collection: 'verification-requests',
        data: {
          nickname,
          token: verificationToken,
          status: 'pending',
          user: user.id,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      })

      // Start bot
      try {
        const containerId = await botManager.startVerification(
          nickname,
          verificationToken,
          verificationRequest.id,
          servers,
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
          data: { status: 'failed' },
        })
        throw botError
      }

      return NextResponse.json({
        requestId: verificationRequest.id,
        token: verificationToken,
        status: 'pending',
        message: 'Verification started. Join a DDNet server to receive your token.',
      })
    }

    // Step 2: Check status (same as regular verification)
    if (action === 'status') {
      if (!requestId) {
        return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
      }

      const verificationRequest = await payload.findByID({
        collection: 'verification-requests',
        id: requestId,
      })

      if (!verificationRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
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
    }

    // Step 3: Confirm token and set new password
    if (action === 'reset') {
      if (!requestId || !token || !newPassword) {
        return NextResponse.json(
          { error: 'Request ID, token, and new password are required' },
          { status: 400 },
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 },
        )
      }

      const verificationRequest = await payload.findByID({
        collection: 'verification-requests',
        id: requestId,
      })

      if (!verificationRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
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

      // Get user ID
      const userId =
        typeof verificationRequest.user === 'string'
          ? verificationRequest.user
          : verificationRequest.user?.id

      if (!userId) {
        return NextResponse.json({ error: 'User not found in request' }, { status: 400 })
      }

      // Update password
      await payload.update({
        collection: 'users',
        id: userId,
        data: {
          password: newPassword,
        },
      })

      // Mark verification as success
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
        message: 'Password reset successfully. You can now log in with your new password.',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
