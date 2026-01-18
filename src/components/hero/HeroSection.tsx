'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import type { Session } from 'next-auth'

interface HeroSectionProps {
  session: Session | null
}

export function HeroSection({ session }: HeroSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isTouchDevice, setIsTouchDevice] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [showAuthError, setShowAuthError] = useState(false)

  useEffect(() => {
    // Detect touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouchDevice(hasTouch)
    setShowWarning(!hasTouch)

    // Check for OAuth callback error (403 from Spotify)
    // Only show error if not already logged in
    const error = searchParams.get('error')
    if (error === 'OAuthCallback' && !session) {
      setShowAuthError(true)
    }
  }, [searchParams, session])

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
      {/* OAuth Error (403 - Not Whitelisted) */}
      {showAuthError && (
        <div className="absolute top-4 left-4 right-4 z-20 max-w-2xl mx-auto">
          <div className="bg-red-900/40 border-2 border-red-500/60 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🔒</span>
              <div className="text-left flex-1">
                <h3
                  className="text-xl font-bold text-red-400 mb-2"
                  style={{ fontFamily: 'var(--font-righteous)' }}
                >
                  Access Restricted
                </h3>
                <p className="text-red-200 mb-2">
                  This Spotify app is in Development Mode and you're not on the allowed users list.
                </p>
                <p className="text-red-100 font-semibold">
                  <a
                    href="https://forms.gle/FRZFgijrdqucJaaV8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors"
                  >
                    Request access here
                  </a>{' '}
                  to be added to the whitelist.
                </p>
                <button
                  onClick={() => setShowAuthError(false)}
                  className="mt-3 text-red-400 hover:text-red-300 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-Touch Device Warning - Top of page */}
      {showWarning && !showAuthError && (
        <div className="absolute top-4 left-4 right-4 z-20 max-w-2xl mx-auto">
          <div className="bg-yellow-900/40 border-2 border-yellow-500/60 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div className="text-left flex-1">
                <h3
                  className="text-lg font-bold text-yellow-400 mb-1"
                  style={{ fontFamily: 'var(--font-righteous)' }}
                >
                  Touch Device Recommended
                </h3>
                <p className="text-yellow-200 text-sm">
                  Mixtape Duel is designed for touch devices like tablets and smartphones and doesn't really make sense on a desktop, sorry.
                </p>
                <button
                  onClick={() => setShowWarning(false)}
                  className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Title with Audiowide font and readable neon effect */}
        <h1
          className="text-6xl md:text-7xl font-bold mb-2"
          style={{
            fontFamily: 'var(--font-audiowide)',
            color: '#FFFFFF',
            textShadow: '0 0 5px var(--neon-pink), 0 0 10px var(--neon-pink), 0 0 15px var(--hot-magenta), 0 2px 4px rgba(0,0,0,0.8)',
            WebkitTextStroke: '1px rgba(255, 110, 199, 0.3)',
          }}
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
