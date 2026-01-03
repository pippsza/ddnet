'use client'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

export default function Example() {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[200px] bg-yellow-500">
      <ResizablePanel defaultSize="50%">
        <div className="p-4">Левая панель</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel className="bg-blue-900" defaultSize="50%">
        <div className="p-4">Правая панель</div>
        <button
          onClick={() => {
            fetch('/api/users/logout', { method: 'POST' })
          }}
        >
          Logout
        </button>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
