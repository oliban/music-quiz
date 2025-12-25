'use client'

import { useEffect, useRef } from 'react'
import type { TouchZone, Team } from '@/src/store/gameStore'

interface TouchZonesProps {
  zones: TouchZone[]
  teams: Team[]
  disqualifiedTeams: Set<string>
  onZoneTouch: (zoneId: string) => void
  onZoneMount?: (zoneId: string, rect: DOMRect) => void
}

const ZONE_STYLES: Record<TouchZone['position'], string> = {
  'top-left': 'top-0 left-0',
  'top-right': 'top-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'bottom-right': 'bottom-0 right-0',
  'center-top': 'top-0 left-1/2 -translate-x-1/2',
  'center-bottom': 'bottom-0 left-1/2 -translate-x-1/2',
  'left-middle': 'top-1/2 left-0 -translate-y-1/2',
  'right-middle': 'top-1/2 right-0 -translate-y-1/2',
}

export function TouchZones({ zones, teams, disqualifiedTeams, onZoneTouch, onZoneMount }: TouchZonesProps) {
  const zoneElementRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    if (onZoneMount) {
      zoneElementRefs.current.forEach((element, zoneId) => {
        const rect = element.getBoundingClientRect()
        onZoneMount(zoneId, rect)
      })

      // Update on window resize
      const handleResize = () => {
        zoneElementRefs.current.forEach((element, zoneId) => {
          const rect = element.getBoundingClientRect()
          onZoneMount(zoneId, rect)
        })
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [zones, onZoneMount])

  const handleTouchStart = (zoneId: string) => {
    onZoneTouch(zoneId)
  }

  return (
    <>
      {zones.map((zone) => {
        const isDisqualified = disqualifiedTeams.has(zone.teamId)
        return (
          <button
            key={zone.id}
            ref={(el) => {
              if (el) {
                zoneElementRefs.current.set(zone.id, el)
              }
            }}
            onTouchStart={() => handleTouchStart(zone.id)}
            onClick={() => handleTouchStart(zone.id)}
            className={`absolute w-32 h-32 rounded-lg border-4 transition-all active:scale-95 ${ZONE_STYLES[zone.position]} ${
              isDisqualified ? 'border-red-500 opacity-50' : 'border-white/20'
            }`}
            style={{ backgroundColor: zone.color }}
          >
            {isDisqualified && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-500 text-6xl font-bold">✗</div>
              </div>
            )}
            <span className="sr-only">Team Zone {zone.teamId}</span>
          </button>
        )
      })}
    </>
  )
}
