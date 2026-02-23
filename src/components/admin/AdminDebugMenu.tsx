'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bug, X, ShieldOff } from 'lucide-react'

export function AdminDebugMenu() {
  const [open, setOpen] = useState(false)

  const handleUnverify = async () => {
    try {
      const res = await fetch('/api/admin/debug/unverify', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Верификация сброшена')
    } catch {
      toast.error('Ошибка при сбросе верификации')
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full h-10 w-10 bg-background border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
        onClick={() => setOpen(true)}
      >
        <Bug className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 rounded-lg border bg-background shadow-lg">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <Bug className="h-4 w-4 text-yellow-500" />
          Debug
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="p-3 space-y-2">
        <Button variant="destructive" size="sm" className="w-full justify-start" onClick={handleUnverify}>
          <ShieldOff className="mr-2 h-4 w-4" />
          Unverify me
        </Button>
      </div>
    </div>
  )
}
