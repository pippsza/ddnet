import type { LucideProps } from 'lucide-react'
import {
  Sprout,
  Mountain,
  Flame,
  Skull,
  Bot,
  Crown,
  Clock,
  User,
  Timer,
  Star,
  Heart,
  Gem,
  Trophy,
  Target,
  Puzzle,
  Gamepad2,
  Sword,
  Shield,
  Rocket,
  Globe,
  Compass,
  Crosshair,
  Dice1,
  Music,
  BookOpen,
  Palette,
  Sparkles,
  Zap,
  Map,
} from 'lucide-react'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Sprout,
  Mountain,
  Flame,
  Skull,
  Bot,
  Crown,
  Clock,
  User,
  Timer,
  Star,
  Heart,
  Gem,
  Trophy,
  Target,
  Puzzle,
  Gamepad2,
  Sword,
  Shield,
  Rocket,
  Globe,
  Compass,
  Crosshair,
  Dice1,
  Music,
  BookOpen,
  Palette,
  Sparkles,
  Zap,
  Map,
}

export function getCategoryIconName(category: string): string | undefined {
  return DDNET_CATEGORIES.find((c) => c.value === category)?.icon
}

export function CategoryIcon({
  category,
  iconName,
  className,
  style,
}: {
  category?: string
  iconName?: string
  className?: string
  style?: React.CSSProperties
}) {
  const name = iconName ?? (category ? getCategoryIconName(category) : undefined)
  const Icon = name ? ICON_MAP[name] : null
  if (!Icon) return null
  return <Icon className={className} style={style} />
}

export { ICON_MAP }
