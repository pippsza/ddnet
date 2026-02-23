import { cn } from '@/lib/utils'

/**
 * Static Lexical JSON renderer — converts stored Lexical JSON to React elements.
 * Matches the theme classes from LexicalRichTextEditor for visual consistency.
 * No editor bundle loaded — just walks the JSON tree.
 */

// Lexical text format bitmask values
const IS_BOLD = 1
const IS_ITALIC = 2
const IS_STRIKETHROUGH = 4
const IS_UNDERLINE = 8

function renderTextFormat(format: number): string {
  const classes: string[] = []
  if (format & IS_BOLD) classes.push('font-bold')
  if (format & IS_ITALIC) classes.push('italic')
  if (format & IS_STRIKETHROUGH) classes.push('line-through')
  if (format & IS_UNDERLINE) classes.push('underline')
  return classes.join(' ')
}

function renderChildren(children: any[]): React.ReactNode[] {
  return children.map((child, i) => renderNode(child, i))
}

function renderNode(node: any, key: number | string): React.ReactNode {
  if (!node) return null

  // Text node
  if (node.type === 'text') {
    const formatClass = renderTextFormat(node.format || 0)
    if (formatClass) {
      return <span key={key} className={formatClass}>{node.text}</span>
    }
    return <span key={key}>{node.text}</span>
  }

  // Linebreak
  if (node.type === 'linebreak') {
    return <br key={key} />
  }

  // Link
  if (node.type === 'link' || node.type === 'autolink') {
    return (
      <a
        key={key}
        href={node.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline cursor-pointer hover:text-primary/80"
      >
        {node.children ? renderChildren(node.children) : node.url}
      </a>
    )
  }

  // Paragraph
  if (node.type === 'paragraph') {
    return (
      <p key={key} className="mb-1 last:mb-0">
        {node.children?.length ? renderChildren(node.children) : <br />}
      </p>
    )
  }

  // Heading
  if (node.type === 'heading') {
    const Tag = node.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    const headingClasses: Record<string, string> = {
      h1: 'text-2xl font-bold mb-2',
      h2: 'text-xl font-semibold mb-1.5',
      h3: 'text-lg font-medium mb-1',
    }
    return (
      <Tag key={key} className={headingClasses[Tag] || 'font-medium mb-1'}>
        {node.children ? renderChildren(node.children) : null}
      </Tag>
    )
  }

  // Quote
  if (node.type === 'quote') {
    return (
      <blockquote
        key={key}
        className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-1"
      >
        {node.children ? renderChildren(node.children) : null}
      </blockquote>
    )
  }

  // List
  if (node.type === 'list') {
    const Tag = node.listType === 'number' ? 'ol' : 'ul'
    const listClass = node.listType === 'number' ? 'list-decimal ml-6 mb-1' : 'list-disc ml-6 mb-1'
    return (
      <Tag key={key} className={listClass}>
        {node.children ? renderChildren(node.children) : null}
      </Tag>
    )
  }

  // List item
  if (node.type === 'listitem') {
    return (
      <li key={key} className="mb-0.5">
        {node.children ? renderChildren(node.children) : null}
      </li>
    )
  }

  // Root — render children directly
  if (node.type === 'root') {
    return <>{node.children ? renderChildren(node.children) : null}</>
  }

  // Fallback: render children if present, or text
  if (node.children) {
    return <div key={key}>{renderChildren(node.children)}</div>
  }

  return null
}

interface LexicalContentProps {
  content: any
  className?: string
}

export function LexicalContent({ content, className }: LexicalContentProps) {
  // Plain string fallback
  if (typeof content === 'string') {
    return <p className={cn('whitespace-pre-wrap wrap-break-word', className)}>{content}</p>
  }

  // Not valid Lexical JSON
  if (!content?.root?.children) {
    return null
  }

  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      {renderChildren(content.root.children)}
    </div>
  )
}
