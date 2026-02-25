'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Users, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TeeAvatarWithFallback } from '@/components/tee/TeeAvatar'

type Mode = 'solo' | 'team'

interface ModePreviewProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
  disabled?: boolean
}

interface PlayerInfo {
  name: string
  skin?: { name: string; colorBody?: number; colorFeet?: number }
}

interface SkinInfo {
  name: string
  colorBody?: number
  colorFeet?: number
}

/** Single tee avatar slot — required players are solid, optional are ghost (dashed) */
const TeeSlot = React.memo(function TeeSlot({
  skin,
  ghost,
  delay,
  label,
  borderColor,
}: {
  skin: SkinInfo
  ghost?: boolean
  delay?: number
  label?: string
  borderColor: string
}) {
  const skinUrl = `https://skins.ddnet.org/skin/community/${skin.name}.png`

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: ghost ? 0.4 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.3, delay: delay ?? 0, ease: 'backOut' }}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center overflow-hidden',
          ghost && 'border-2 border-dashed',
          ghost && borderColor,
        )}
      >
        {ghost ? (
          <User className="h-4 w-4 text-muted-foreground/50" />
        ) : (
          <TeeAvatarWithFallback
            skinUrl={skinUrl}
            bodyColor={skin.colorBody}
            feetColor={skin.colorFeet}
            size="xs"
          />
        )}
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
      )}
    </motion.div>
  )
})

/** A team group: bracket + players */
const TeamGroup = React.memo(function TeamGroup({
  slots,
  teamLabel,
  borderColor,
  slotBorder,
  delay,
}: {
  slots: { skin?: SkinInfo; ghost: boolean; label: string }[]
  teamLabel: string
  borderColor: string
  slotBorder: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, delay }}
      className={cn('flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3', borderColor)}
    >
      <span className="text-[11px] font-medium text-muted-foreground">{teamLabel}</span>
      <div className="flex items-center gap-3">
        {slots.map((slot, i) => (
          <TeeSlot
            key={i}
            skin={slot.skin || { name: 'default' }}
            ghost={slot.ghost}
            delay={delay + 0.1 + i * 0.15}
            label={slot.label}
            borderColor={slotBorder}
          />
        ))}
      </div>
    </motion.div>
  )
})

/** Standalone mode selector buttons — use in the form column */
export function ModeSelector({ mode, onModeChange, disabled }: ModePreviewProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('solo')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 text-sm font-medium transition-all',
          mode === 'solo'
            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <User className="h-4 w-4" />
        Solo
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('team')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 text-sm font-medium transition-all',
          mode === 'team'
            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Users className="h-4 w-4" />
        Team
      </button>
    </div>
  )
}

export function ModePreview({
  mode,
  currentUser,
  opponent,
}: {
  mode: Mode
  currentUser?: PlayerInfo | null
  opponent?: PlayerInfo | null
}) {
  const mySkin: SkinInfo | undefined = currentUser?.skin
    ? { name: currentUser.skin.name, colorBody: currentUser.skin.colorBody, colorFeet: currentUser.skin.colorFeet }
    : undefined
  const myLabel = currentUser?.name || 'You'

  const oppSkin: SkinInfo | undefined = opponent?.skin
    ? { name: opponent.skin.name, colorBody: opponent.skin.colorBody, colorFeet: opponent.skin.colorFeet }
    : undefined
  const oppLabel = opponent?.name || 'Opponent'

  return (
    <div className="flex flex-col gap-3">
      {/* Visual preview */}
      <div className="flex items-center justify-center py-2 min-h-[110px]">
        <AnimatePresence mode="wait">
          {mode === 'solo' ? (
            <motion.div
              key="solo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-red-500/30 px-5 py-3">
                <span className="text-[11px] font-medium text-muted-foreground">Your Team</span>
                <div className="flex items-center gap-3">
                  <TeeSlot
                    skin={mySkin || { name: 'default' }}
                    ghost={!mySkin}
                    delay={0.1}
                    label={myLabel}
                    borderColor="border-red-500"
                  />
                  <TeeSlot
                    skin={{ name: 'default' }}
                    ghost
                    delay={0.25}
                    label="Teammate"
                    borderColor="border-red-500/40"
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">No opponents — solo completion</span>
            </motion.div>
          ) : (
            <motion.div
              key="team"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-3">
                <TeamGroup
                  slots={[
                    { skin: mySkin, ghost: !mySkin, label: myLabel },
                    { ghost: true, label: 'Teammate' },
                  ]}
                  teamLabel="Team 1"
                  borderColor="border-red-500/30"
                  slotBorder="border-red-500"
                  delay={0.05}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                >
                  <Swords className="h-5 w-5 text-muted-foreground" />
                </motion.div>
                <TeamGroup
                  slots={[
                    { skin: oppSkin, ghost: !opponent, label: oppLabel },
                    { ghost: true, label: 'Teammate' },
                  ]}
                  teamLabel="Team 2"
                  borderColor="border-blue-500/30"
                  slotBorder="border-blue-500"
                  delay={0.15}
                />
              </div>
              <span className="text-xs text-muted-foreground">2 teams compete — 1-2 players each</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
