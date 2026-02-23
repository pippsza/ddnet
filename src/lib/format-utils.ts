export function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = (seconds % 60).toFixed(2)
  return `${min}:${sec.padStart(5, '0')}`
}

export function formatPlaytime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours.toLocaleString()}h ${mins}m`
  return `${mins}m`
}

export function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
