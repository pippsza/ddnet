'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import {
  Group as ResizablePrimitiveGroup,
  Panel as ResizablePrimitivePanel,
  Separator as ResizablePrimitiveSeparator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from 'react-resizable-panels'

import { cn } from '@/lib/utils'

/**
 * ResizablePanelGroup wraps resizable Panel components.
 * Content can be resized horizontally or vertically.
 */
function ResizablePanelGroup({ className, ...props }: GroupProps & { className?: string }) {
  return (
    <ResizablePrimitiveGroup
      data-slot="resizable-panel-group"
      className={cn('flex h-full w-full data-[orientation=vertical]:flex-col', className)}
      {...props}
    />
  )
}

/**
 * ResizablePanel wraps resizable content.
 * Can be configured with min/max size constraints and collapsible behavior.
 */
function ResizablePanel({ className, ...props }: PanelProps & { className?: string }) {
  return (
    <ResizablePrimitivePanel data-slot="resizable-panel" className={cn('', className)} {...props} />
  )
}

/**
 * ResizableHandle (Separator) provides the resize handle between panels.
 * Users can drag it to resize adjacent panels.
 */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: SeparatorProps & {
  withHandle?: boolean
  className?: string
}) {
  return (
    <ResizablePrimitiveSeparator
      data-slot="resizable-handle"
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:translate-x-0 data-[orientation=vertical]:after:-translate-y-1/2 [&[data-orientation=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitiveSeparator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
