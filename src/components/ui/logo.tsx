import { type SVGProps } from 'react'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* "DDash" — large, bold, top-left */}
      <text
        x="0"
        y="32"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="36"
        fill="currentColor"
        letterSpacing="-1"
      >
        DDash
      </text>

      {/* Step / ledge line connecting the two words */}
      <rect x="118" y="34" width="2" height="12" rx="1" fill="currentColor" opacity="0.25" />
      <rect x="118" y="44" width="72" height="2" rx="1" fill="currentColor" opacity="0.25" />

      {/* "Board" — smaller, lower-right, like a step down */}
      <text
        x="124"
        y="56"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize="18"
        fill="currentColor"
        opacity="0.55"
      >
        Board
      </text>
    </svg>
  )
}

export function LogoIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Compact "DD" mark */}
      <text
        x="2"
        y="30"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="30"
        fill="currentColor"
        letterSpacing="-2"
      >
        DD
      </text>
      {/* Small step accent */}
      <rect x="30" y="32" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.35" />
    </svg>
  )
}
