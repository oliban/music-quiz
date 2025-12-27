'use client'

import { useSession } from 'next-auth/react'
import { HeroSection } from '../src/components/hero/HeroSection'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center cassette-gradient">
        <p
          className="text-white text-2xl"
          style={{
            textShadow: '0 0 5px var(--neon-pink), 0 0 10px var(--neon-pink), 0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          Loading...
        </p>
      </div>
    )
  }

  return <HeroSection session={session} />
}
