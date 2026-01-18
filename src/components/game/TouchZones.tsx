'use client'

import { useEffect, useRef } from 'react'
import type { TouchZone, Team } from '@/src/store/gameStore'
import { TEXT_SHADOWS } from '@/src/lib/styles/textShadows'

interface TouchZonesProps {
  zones: TouchZone[]
  teams: Team[]
  disqualifiedTeams: Set<string>
  skippedTeams: Set<string>
  celebratingTeam: string | null
  onZoneTouch: (zoneId: string) => void
  onSkip: (teamId: string) => void
  currentQuestionType?: 'buzz-in' | 'multiple-choice' | 'trivia' | null
  buzzedTeam?: string | null
}

const ZONE_STYLES: Record<TouchZone['position'], string> = {
  'center-top': 'top-[12%] left-1/2 -translate-x-1/2',
  'center-bottom': 'bottom-[12%] left-1/2 -translate-x-1/2',
}

const ZONE_ROTATIONS: Record<TouchZone['position'], string> = {
  'center-top': 'rotate-180',
  'center-bottom': '',
}

export function TouchZones({ zones, teams, disqualifiedTeams, skippedTeams, celebratingTeam, onZoneTouch, onSkip, currentQuestionType, buzzedTeam }: TouchZonesProps) {
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
        const hasSkipped = skippedTeams.has(zone.teamId)
        const isCelebrating = celebratingTeam === zone.teamId
        const isTopZone = zone.position === 'center-top'

        const showBuzzer = currentQuestionType === 'buzz-in'

        return (
          <div key={zone.id}>
            {/* Skip button - positioned in upper left corner of each player's area */}
            <button
              onTouchStart={(e) => { e.stopPropagation(); onSkip(zone.teamId); }}
              onClick={(e) => { e.stopPropagation(); onSkip(zone.teamId); }}
              disabled={hasSkipped || isDisqualified}
              className={`absolute z-[100] w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full transition-all active:scale-95 ${
                hasSkipped ? 'opacity-40' : 'opacity-60 hover:opacity-90'
              } ${isTopZone ? 'top-[29%] left-4 rotate-180' : 'top-[66%] left-4'}`}
              style={{
                background: hasSkipped
                  ? 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)'
                  : 'linear-gradient(180deg, #6b7280 0%, #374151 50%, #1f2937 100%)',
                boxShadow: hasSkipped
                  ? 'inset 0 2px 4px rgba(0,0,0,0.5)'
                  : '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.1)',
                border: '2px solid #4b5563',
              }}
            >
              <span className="text-white/80 text-[10px] sm:text-xs font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                {hasSkipped ? '⏭' : 'SKIP'}
              </span>
            </button>

            {/* Main buzzer button - only for buzz-in questions */}
            {showBuzzer && <button
              onTouchStart={() => handleTouchStart(zone.id)}
              onClick={() => handleTouchStart(zone.id)}
              className={`absolute z-[100] ${ZONE_STYLES[zone.position]} ${ZONE_ROTATIONS[zone.position]} ${
                isDisqualified ? 'opacity-50' : ''
              } ${isCelebrating ? 'scale-110' : ''} transition-transform`}
            >
              {/* Outer base/housing - dark ring */}
              <div
                className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, #4a4a4a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                  boxShadow: isCelebrating
                    ? `0 0 40px ${zone.color}, 0 0 80px ${zone.color}, 0 8px 20px rgba(0,0,0,0.8)`
                    : '0 8px 20px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.1)',
                  border: '3px solid #2a2a2a',
                }}
              >
                {/* Inner dome button */}
                <div
                  className={`w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full relative transition-all duration-75 ${
                    isCelebrating ? 'animate-pulse' : ''
                  } active:scale-95 active:translate-y-1`}
                  style={{
                    background: isCelebrating
                      ? `radial-gradient(circle at 30% 30%, ${zone.color} 0%, ${zone.color}dd 40%, ${zone.color}99 100%)`
                      : `radial-gradient(circle at 30% 30%, ${zone.color} 0%, ${zone.color}cc 50%, ${zone.color}88 100%)`,
                    boxShadow: isCelebrating
                      ? `0 0 30px ${zone.color}, inset 0 -4px 12px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.4)`
                      : `0 6px 12px rgba(0,0,0,0.5), inset 0 -4px 12px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.3)`,
                    border: isDisqualified ? '3px solid #ef4444' : isCelebrating ? `3px solid #facc15` : '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {/* Glossy highlight */}
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-4 sm:w-14 sm:h-5 md:w-16 md:h-6 rounded-full opacity-60"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
                    }}
                  />

                  {/* Content overlay */}
                  {isDisqualified && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="text-white text-4xl sm:text-5xl md:text-6xl font-bold"
                        style={{ textShadow: TEXT_SHADOWS.score }}
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
                </div>
              </div>
              <span className="sr-only">Team Zone {zone.teamId}</span>
            </button>}
          </div>
        )
      })}
    </>
  )
}
