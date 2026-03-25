import { NextRequest, NextResponse } from 'next/server'
import { fetchKoGPlayerData } from '@/lib/kog-helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const playerName = decodeURIComponent(name)

  try {
    const data = await fetchKoGPlayerData(playerName)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(null)
  }
}
