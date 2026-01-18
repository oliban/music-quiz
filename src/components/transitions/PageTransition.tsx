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
    <div className={isTransitioning ? 'animate-page-fade-out' : 'animate-page-fade-in'}>
      {displayChildren}
    </div>
  )
}
