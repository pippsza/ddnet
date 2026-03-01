'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface JoinGameButtonProps {
  serverIp: string
  serverPort: number
  className?: string
}

export function JoinGameButton({
  serverIp,
  serverPort,
  className,
}: JoinGameButtonProps) {
  const bingoUrl = `bingo://${serverIp}:${serverPort}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className={className} asChild>
          <a href={bingoUrl}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Join
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Open in Bingo Client</TooltipContent>
    </Tooltip>
  )
}
