'use client'

import { useEffect } from 'react'

export function DebugConsole() {
  useEffect(() => {
    // Only load in development and on mobile
    if (process.env.NODE_ENV === 'development') {
      import('eruda').then((eruda) => {
        eruda.default.init()
        console.log('📱 Mobile debug console loaded! Tap the icon in bottom-right corner.')
      })
    }
  }, [])

  return null
}
