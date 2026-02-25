import { Construction } from 'lucide-react'
import Link from 'next/link'

export function MaintenancePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Application Under Maintenance</h1>
          <p className="text-muted-foreground">
            We are currently performing maintenance. Please check back later.
          </p>
        </div>
      </div>
    </div>
  )
}
