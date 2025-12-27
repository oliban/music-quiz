'use client'

import { useSession } from 'next-auth/react'
import { HeroSection } from '../src/components/hero/HeroSection'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center cassette-gradient">
        <p className="text-white text-2xl neon-text">Loading...</p>
      </div>
    )
  }

  return <HeroSection session={session} />
}
