import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Standard categories
    const categories = DDNET_CATEGORIES.map((c) => ({
      slug: c.value,
      name: c.label,
      isCustom: false,
    }))

    // Custom categories from global
    const global = await payload.findGlobal({ slug: 'custom-categories' })
    for (const cat of global?.categories ?? []) {
      categories.push({
        slug: cat.slug,
        name: cat.name,
        isCustom: true,
      })
    }

    return NextResponse.json({ categories })
  } catch (error: unknown) {
    console.error('[API] Error fetching categories:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      { status: 500 },
    )
  }
}
