'use client'

import { useEffect, useRef } from 'react'
import type { TouchZone, Team } from '@/src/store/gameStore'
import { TEXT_SHADOWS } from '@/src/lib/styles/textShadows'

interface TouchZonesProps {
  zones: TouchZone[]
  teams: Team[]
  disqualifiedTeams: Set<string>
  celebratingTeam: string | null
  onZoneTouch: (zoneId: string) => void
  currentQuestionType?: 'buzz-in' | 'drag-to-corner' | null
  buzzedTeam?: string | null
}

const ZONE_STYLES: Record<TouchZone['position'], string> = {
  'center-top': 'top-0 left-1/2 -translate-x-1/2',
  'center-bottom': 'bottom-0 left-1/2 -translate-x-1/2',
}

const ZONE_ROTATIONS: Record<TouchZone['position'], string> = {
  'center-top': 'rotate-180',
  'center-bottom': '',
}

export function TouchZones({ zones, teams, disqualifiedTeams, celebratingTeam, onZoneTouch, currentQuestionType, buzzedTeam }: TouchZonesProps) {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const soundLoadErrors = useRef<Set<string>>(new Set())

  const playBuzzerSound = (zone: TouchZone) => {
    const team = teams.find(t => t.id === zone.teamId)
    if (!team?.buzzerSound) return

    // Get or create audio element for this team
    let audio = audioRefs.current.get(zone.teamId)
    if (!audio) {
      audio = new Audio(team.buzzerSound)
      audioRefs.current.set(zone.teamId, audio)
    }

    // Reset and play sound
    audio.currentTime = 0
    audio.play().catch(err => {
      // Only log error once per team to avoid console spam
      if (!soundLoadErrors.current.has(zone.teamId)) {
        soundLoadErrors.current.add(zone.teamId)
        console.warn(
          `Buzzer sound for ${team.name} could not be loaded. ` +
          `Please add sound files to public/sounds/ directory. ` +
          `See public/sounds/README.md for instructions.`
        )
      }
    })
  }

  const handleTouchStart = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    // Only play buzzer sound if:
    // 1. There's an active buzz-in question
    // 2. No team has buzzed yet
    if (zone && currentQuestionType === 'buzz-in' && !buzzedTeam) {
      playBuzzerSound(zone)
    }
    onZoneTouch(zoneId)
  }

  return (
    <>
      {zones.map((zone) => {
        const isDisqualified = disqualifiedTeams.has(zone.teamId)
        const isCelebrating = celebratingTeam === zone.teamId
        const team = teams.find(t => t.id === zone.teamId)
        const score = team?.score ?? 0

        return (
          <button
            key={zone.id}
            onTouchStart={() => handleTouchStart(zone.id)}
            onClick={() => handleTouchStart(zone.id)}
            className={`absolute w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg border-2 sm:border-4 transition-all active:scale-95 z-[100] ${ZONE_STYLES[zone.position]} ${ZONE_ROTATIONS[zone.position]} ${
              isDisqualified
                ? 'border-red-500 opacity-50'
                : isCelebrating
                ? 'border-yellow-400 border-4 sm:border-8 animate-pulse scale-110 shadow-2xl'
                : 'border-white/20'
            }`}
            style={{
              backgroundColor: zone.color,
              boxShadow: isCelebrating ? `0 0 40px ${zone.color}, 0 0 80px ${zone.color}` : undefined
            }}
          >
            {/* Score display */}
            {!isDisqualified && !isCelebrating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-white text-3xl sm:text-4xl md:text-5xl font-bold"
                  style={{
                    textShadow: TEXT_SHADOWS.score
                  }}
                >
                  {score}
                </div>
              </div>
            )}
            {isDisqualified && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-white text-4xl sm:text-5xl md:text-6xl font-bold"
                  style={{
                    textShadow: TEXT_SHADOWS.score
                  }}
                >
                  ✗
                </div>
              </div>
            )}
            {isCelebrating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-yellow-400 text-5xl sm:text-6xl md:text-7xl animate-bounce">🎉</div>
              </div>
            )}
            <span className="sr-only">Team Zone {zone.teamId}</span>
          </button>
        )
      })}
    </>
  )
}
