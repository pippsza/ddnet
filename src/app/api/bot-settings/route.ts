import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export async function GET() {
  try {
    const payload = await getPayload({ config: payloadConfig })
    const settings = await payload.findGlobal({ slug: 'bot-settings' })

    return NextResponse.json({
      verificationBotEnabled: settings.verificationBotEnabled ?? true,
      raceBotEnabled: settings.raceBotEnabled ?? true,
      ingameChatBotEnabled: settings.ingameChatBotEnabled ?? true,
    })
  } catch (error) {
    console.error('[BotSettings] Error:', error)
    // Fail-open: return all enabled if settings can't be loaded
    return NextResponse.json({
      verificationBotEnabled: true,
      raceBotEnabled: true,
      ingameChatBotEnabled: true,
    })
  }
}
