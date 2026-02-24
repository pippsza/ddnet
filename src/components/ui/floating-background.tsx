'use client'

import { useState, useEffect } from 'react'

interface Ball {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
  dx: number
  dy: number
}

function generateBalls(count: number): Ball[] {
  const balls: Ball[] = []
  for (let i = 0; i < count; i++) {
    balls.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.3 + Math.random() * 1.5,
      opacity: 0.15 + Math.random() * 0.35,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 4,
      dx: (Math.random() - 0.5) * 24,
      dy: (Math.random() - 0.5) * 20,
    })
  }
  return balls
}

export function FloatingBackground({ count = 40 }: { count?: number }) {
  const [balls, setBalls] = useState<Ball[]>([])

  useEffect(() => {
    setBalls(generateBalls(count))
  }, [count])

  if (balls.length === 0) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {balls.map((ball) => (
        <div
          key={ball.id}
          className="floating-ball"
          style={{
            left: `${ball.x}vw`,
            top: `${ball.y}vh`,
            width: `${ball.size}em`,
            height: `${ball.size}em`,
            opacity: ball.opacity,
            animationDuration: `${ball.duration}s`,
            animationDelay: `${ball.delay}s`,
            '--dx': `${ball.dx}rem`,
            '--dy': `${ball.dy}rem`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
