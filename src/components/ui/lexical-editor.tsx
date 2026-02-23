'use client'

import { useCallback, useState, useEffect } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode, AutoLinkNode, $createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  type EditorState,
  type LexicalEditor,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_MODIFIER_COMMAND,
  KEY_ENTER_COMMAND,
} from 'lexical'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createParagraphNode } from 'lexical'
import { $getNearestNodeOfType } from '@lexical/utils'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  RemoveFormatting,
  Check,
} from 'lucide-react'

const theme = {
  paragraph: 'mb-2',
  heading: {
    h1: 'text-2xl font-bold mb-3',
    h2: 'text-xl font-semibold mb-2',
    h3: 'text-lg font-medium mb-2',
  },
  list: {
    ul: 'list-disc ml-6 mb-2',
    ol: 'list-decimal ml-6 mb-2',
    listitem: 'mb-1',
  },
  quote: 'border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-2',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
  link: 'text-primary underline cursor-pointer hover:text-primary/80',
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded hover:bg-muted transition-colors',
        active && 'bg-muted text-primary',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />
}

function Toolbar({ compact }: { compact?: boolean }) {
  const [editor] = useLexicalComposerContext()
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [activeBlock, setActiveBlock] = useState<string>('paragraph')
  const [isLink, setIsLink] = useState(false)

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const formats = new Set<string>()
        if (selection.hasFormat('bold')) formats.add('bold')
        if (selection.hasFormat('italic')) formats.add('italic')
        if (selection.hasFormat('underline')) formats.add('underline')
        if (selection.hasFormat('strikethrough')) formats.add('strikethrough')
        setActiveFormats(formats)

        const anchorNode = selection.anchor.getNode()
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow()

        const type = element.getType()
        if (type === 'heading') {
          setActiveBlock((element as any).getTag?.() || 'paragraph')
        } else if (type === 'quote') {
          setActiveBlock('quote')
        } else if (type === 'listitem') {
          const listNode = $getNearestNodeOfType(anchorNode, ListNode)
          setActiveBlock(listNode?.getListType() === 'number' ? 'ol' : 'ul')
        } else {
          setActiveBlock('paragraph')
        }

        // Check if selection is inside a link
        const node = selection.anchor.getNode()
        const parent = node.getParent()
        setIsLink($isLinkNode(parent) || $isLinkNode(node))
      })
    })
  }, [editor])

  const formatText = useCallback(
    (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
    },
    [editor],
  )

  const formatBlock = useCallback(
    (type: 'h1' | 'h2' | 'h3' | 'quote' | 'paragraph') => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        if (type === 'h1' || type === 'h2' || type === 'h3') {
          $setBlocksType(selection, () => $createHeadingNode(type))
        } else if (type === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode())
        } else {
          $setBlocksType(selection, () => $createParagraphNode())
        }
      })
    },
    [editor],
  )

  const formatAlign = useCallback(
    (align: 'left' | 'center' | 'right') => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align)
    },
    [editor],
  )

  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const submitLink = useCallback(() => {
    if (linkUrl.trim()) {
      const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    }
    setLinkUrl('')
    setLinkPopoverOpen(false)
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
  }, [editor])

  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const nodes = selection.getNodes()
      nodes.forEach((node) => {
        if ($isTextNode(node)) {
          node.setFormat(0)
        }
      })
      $setBlocksType(selection, () => $createParagraphNode())
    })
  }, [editor])

  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className="flex items-center gap-0.5 border-b px-2 py-1.5 flex-wrap">
      {/* Text formatting */}
      <ToolbarButton onClick={() => formatText('bold')} active={activeFormats.has('bold')} title="Bold (Ctrl+B)">
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatText('italic')} active={activeFormats.has('italic')} title="Italic (Ctrl+I)">
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatText('underline')} active={activeFormats.has('underline')} title="Underline (Ctrl+U)">
        <Underline className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatText('strikethrough')} active={activeFormats.has('strikethrough')} title="Strikethrough">
        <Strikethrough className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block formatting */}
      <ToolbarButton onClick={() => formatBlock('h1')} active={activeBlock === 'h1'} title="Heading 1">
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatBlock('h2')} active={activeBlock === 'h2'} title="Heading 2">
        <Heading2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatBlock('h3')} active={activeBlock === 'h3'} title="Heading 3">
        <Heading3 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatBlock('quote')} active={activeBlock === 'quote'} title="Quote">
        <Quote className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatBlock('paragraph')} active={activeBlock === 'paragraph'} title="Normal text">
        <Minus className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        active={activeBlock === 'ul'}
        title="Bullet list"
      >
        <List className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        active={activeBlock === 'ol'}
        title="Numbered list"
      >
        <ListOrdered className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton onClick={() => formatAlign('left')} title="Align left">
        <AlignLeft className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatAlign('center')} title="Align center">
        <AlignCenter className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatAlign('right')} title="Align right">
        <AlignRight className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Link */}
      {isLink ? (
        <ToolbarButton onClick={removeLink} active title="Remove link">
          <Unlink className={iconSize} />
        </ToolbarButton>
      ) : (
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Insert link"
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <LinkIcon className={iconSize} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitLink()
              }}
              className="flex gap-2"
            >
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="h-8 text-sm"
                autoFocus
              />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                <Check className="h-3.5 w-3.5" />
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear formatting */}
      <ToolbarButton onClick={clearFormatting} title="Clear formatting">
        <RemoveFormatting className={iconSize} />
      </ToolbarButton>
    </div>
  )
}

function EnterSubmitPlugin({ onSubmit }: { onSubmit: () => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (event && !event.shiftKey && !event.ctrlKey) {
          event.preventDefault()
          onSubmit()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, onSubmit])

  return null
}

interface LexicalEditorProps {
  onChange: (state: any) => void
  placeholder?: string
  className?: string
  initialContent?: any
  compact?: boolean
  onSubmit?: () => void
}

export function LexicalRichTextEditor({
  onChange,
  placeholder = 'Start writing...',
  className,
  initialContent,
  compact,
  onSubmit,
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: 'RichTextEditor',
    theme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode],
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
    onError: (error: Error) => {
      console.error('[LexicalEditor]', error)
    },
  }

  const handleChange = useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      editorState.read(() => {
        const json = editorState.toJSON()
        onChange(json)
      })
    },
    [onChange],
  )

  const minH = compact ? 'min-h-[80px]' : 'min-h-[300px]'

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('rounded-md border border-input bg-background', className)}>
        <Toolbar compact={compact} />
        <div className={cn('relative', minH)}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className={cn(minH, 'px-4 py-3 text-sm outline-none')} />
            }
            placeholder={
              <div className="absolute top-3 left-4 text-sm text-muted-foreground pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <OnChangePlugin onChange={handleChange} />
      {onSubmit && <EnterSubmitPlugin onSubmit={onSubmit} />}
      {compact && <AutoFocusPlugin />}
    </LexicalComposer>
  )
}
