/**
 * Extract plain text from Lexical JSON or a plain string.
 * Shared across forum, support, articles, and chat pages.
 */
export function extractText(richText: any): string {
  if (typeof richText === 'string') return richText
  if (!richText?.root?.children) return ''
  return richText.root.children
    .map((node: any) => {
      if (node.children) {
        return node.children.map((child: any) => child.text || '').join('')
      }
      return ''
    })
    .join('\n')
}

/** Check if a value looks like Lexical JSON. */
export function isLexicalJson(value: any): boolean {
  return value && typeof value === 'object' && value.root?.children
}
