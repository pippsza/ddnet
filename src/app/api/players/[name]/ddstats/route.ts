import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const playerName = decodeURIComponent(name)

  try {
    const res = await fetch(
      `https://ddstats.tw/player/json?player=${encodeURIComponent(playerName)}`,
      { next: { revalidate: 300 } },
    )

    if (!res.ok) return NextResponse.json(null)

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(null)
  }
}
