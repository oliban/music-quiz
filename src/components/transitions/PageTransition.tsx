'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    // Start transition when pathname changes
    setIsTransitioning(true)

    // Update content halfway through transition
    const updateTimer = setTimeout(() => {
      setDisplayChildren(children)
    }, 300)

    // End transition
    const endTimer = setTimeout(() => {
      setIsTransitioning(false)
    }, 600)

    return () => {
      clearTimeout(updateTimer)
      clearTimeout(endTimer)
    }
  }, [pathname, children])

  return (
    <>
      {/* VHS transition overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Horizontal scan lines glitching effect */}
          <div className="vhs-transition absolute inset-0 bg-black opacity-0 animate-vhs-glitch" />

          {/* Chromatic aberration overlay */}
          <div className="chromatic-transition absolute inset-0 opacity-0 animate-chromatic-split">
            <div className="absolute inset-0 bg-cyan-500 mix-blend-screen opacity-20" style={{ transform: 'translateX(-2px)' }} />
            <div className="absolute inset-0 bg-red-500 mix-blend-screen opacity-20" style={{ transform: 'translateX(2px)' }} />
          </div>
        </div>
      )}

      {/* Page content with fade */}
      <div className={isTransitioning ? 'animate-page-fade-out' : 'animate-page-fade-in'}>
        {displayChildren}
      </div>
    </>
  )
}
