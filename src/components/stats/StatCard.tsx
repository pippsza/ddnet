import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  trend?: string
  accentColor?: string
}

export function StatCard({ title, value, subtitle, trend, accentColor }: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', accentColor && 'border-l-0')}>
      <div className="flex">
        {accentColor && (
          <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />
        )}
        <CardContent className="p-4 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            {accentColor && (
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            )}
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <span className="text-xs font-medium text-emerald-500">{trend}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
