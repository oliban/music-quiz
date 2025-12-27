'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Session } from 'next-auth'

interface HeroSectionProps {
  session: Session | null
}

export function HeroSection({ session }: HeroSectionProps) {
  const router = useRouter()

  const handleButtonClick = () => {
    if (session) {
      // If logged in, go to test-audio page
      router.push('/test-audio')
    } else {
      // If not logged in, sign in with Spotify
      signIn('spotify')
    }
  }

  const buttonText = session ? "Let's play!" : 'Login with Spotify'
  const buttonIcon = session ? '▶' : '▶'
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden cassette-gradient">
      {/* Scan lines overlay */}
      <div className="retro-scanlines absolute inset-0" />

      {/* Main content */}
      <div className="relative z-10 text-center px-4 animate-fadeIn">
        {/* Hero Image - Using pre-cropped image */}
        <div className="mb-8 relative w-full max-w-4xl mx-auto">
          <Image
            src="/hero-image.png"
            alt="Mixtape Duel"
            width={800}
            height={600}
            className="drop-shadow-2xl animate-pulse-slow rounded-lg w-full h-auto"
            priority
          />
        </div>

        {/* Title with Audiowide font and chromatic aberration effect */}
        <h1
          className="text-6xl md:text-7xl font-bold text-white mb-2 neon-text"
          style={{ fontFamily: 'var(--font-audiowide)' }}
          data-text="MIXTAPE DUEL"
        >
          MIXTAPE DUEL
        </h1>

        {/* Subtitle */}
        <p
          className="text-white text-xl md:text-2xl mb-10 tracking-wide"
          style={{ fontFamily: 'var(--font-righteous)' }}
        >
          Two teams. One playlist. Ultimate showdown.
        </p>

        {/* CTA Button with neon glow */}
        <button
          onClick={handleButtonClick}
          className="relative text-white font-bold py-4 px-10 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
          style={{
            backgroundColor: 'var(--neon-pink)',
            fontFamily: 'var(--font-righteous)',
            boxShadow: '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--hot-magenta)';
            e.currentTarget.style.boxShadow = '0 0 30px var(--hot-magenta), 0 0 60px var(--hot-magenta)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--neon-pink)';
            e.currentTarget.style.boxShadow = '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)';
          }}
        >
          {buttonIcon} {buttonText}
        </button>
      </div>

      {/* Background gradient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--neon-pink), var(--neon-purple), transparent)' }}
      />
    </div>
  )
}
