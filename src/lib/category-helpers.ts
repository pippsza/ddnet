import { DDNET_CATEGORIES } from './ddnet-constants'

const STANDARD_CATEGORY_VALUES = DDNET_CATEGORIES.map((c) => c.value)

/**
 * Check if a category value is a standard DDNet category
 */
export function isStandardCategory(value: string): boolean {
  return STANDARD_CATEGORY_VALUES.includes(value)
}

/**
 * Check if a category value refers to a custom category
 */
export function isCustomCategory(value: string): boolean {
  return value.startsWith('custom_')
}

/**
 * Payload field-level validate function for category fields.
 * Accepts standard DDNet categories or custom category slugs that exist in the Global.
 */
export const validateCategory = async (
  value: string | undefined | null,
  { req }: { req: any },
): Promise<string | true> => {
  if (!value) return 'Category is required'

  if (isStandardCategory(value)) return true

  if (!isCustomCategory(value)) {
    return `Invalid category: "${value}". Must be a standard DDNet category or a custom category (custom_ prefix).`
  }

  try {
    const customCats = await req.payload.findGlobal({ slug: 'custom-categories' })
    const exists = customCats?.categories?.some((c: any) => c.slug === value)
    if (!exists) return `Custom category "${value}" does not exist`
  } catch {
    return 'Unable to validate custom category'
  }

  return true
}
