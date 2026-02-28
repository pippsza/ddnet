'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

interface PaginationControlsProps {
  page: number
  totalPages: number
  totalDocs?: number
  limit?: number
  onPageChange: (page: number) => void
  className?: string
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('ellipsis')
  }

  pages.push(total)

  return pages
}

export function PaginationControls({
  page,
  totalPages,
  totalDocs,
  limit,
  onPageChange,
  className,
}: PaginationControlsProps) {
  const t = useTranslations('common')
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages])

  if (totalPages <= 1) return null

  const showInfo = totalDocs != null && limit != null && totalDocs > 0
  const from = showInfo ? (page - 1) * limit! + 1 : 0
  const to = showInfo ? Math.min(page * limit!, totalDocs!) : 0

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {showInfo && (
        <p className="text-xs text-muted-foreground">
          {t('pagination.showing', { from, to, total: totalDocs!.toLocaleString() })}
        </p>
      )}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault()
                if (page > 1) onPageChange(page - 1)
              }}
              className={cn(page <= 1 && 'pointer-events-none opacity-50')}
              href="#"
            />
          </PaginationItem>

          {pageNumbers.map((p, i) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${i}`} className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p} className="hidden sm:block">
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(p)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          {/* Mobile: show "Page X of Y" */}
          <PaginationItem className="sm:hidden">
            <span className="flex items-center px-3 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
          </PaginationItem>

          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault()
                if (page < totalPages) onPageChange(page + 1)
              }}
              className={cn(page >= totalPages && 'pointer-events-none opacity-50')}
              href="#"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
