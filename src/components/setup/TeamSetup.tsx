'use client'

import { useState } from 'react'
import { useGameStore } from '@/src/store/gameStore'
import type { Team } from '@/src/store/gameStore'

const TEAM_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
]

const BUZZER_SOUNDS = [
  { label: 'Buzzer 1', value: '/sounds/buzzer-1.mp3' },
  { label: 'Buzzer 2', value: '/sounds/buzzer-2.mp3' },
]

interface TeamSetupProps {
  onComplete: () => void
}

export function TeamSetup({ onComplete }: TeamSetupProps) {
  const [teamNames, setTeamNames] = useState<string[]>(['Team 1', 'Team 2'])
  const [teamSounds, setTeamSounds] = useState<string[]>([
    BUZZER_SOUNDS[0].value,
    BUZZER_SOUNDS[1].value
  ])
  const setTeams = useGameStore((state) => state.setTeams)
  const setupTouchZones = useGameStore((state) => state.setupTouchZones)

  const handleTeamNameChange = (index: number, name: string) => {
    const newNames = [...teamNames]
    newNames[index] = name
    setTeamNames(newNames)
  }

  const handleTeamSoundChange = (index: number, sound: string) => {
    const newSounds = [...teamSounds]
    newSounds[index] = sound
    setTeamSounds(newSounds)

    // Auto-play preview with cache-busting
    const audio = new Audio(`${sound}?v=${Date.now()}`)
    audio.play().catch(err => console.warn('Sound preview failed:', err))
  }

  const handleComplete = () => {
    const teams: Team[] = teamNames.map((name, index) => ({
      id: `team-${index + 1}`,
      name: name || `Team ${index + 1}`,
      score: 0,
      color: TEAM_COLORS[index],
      buzzerSound: teamSounds[index],
    }))

    setTeams(teams)
    setupTouchZones()
    onComplete()
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold text-white mb-6">Team Setup</h2>

      <div className="space-y-4 mb-8">
        {teamNames.map((name, index) => (
          <div key={index} className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: TEAM_COLORS[index] }}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => handleTeamNameChange(index, e.target.value)}
              placeholder={`Team ${index + 1}`}
              className="flex-1 px-4 py-3 text-lg border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={teamSounds[index]}
              onChange={(e) => handleTeamSoundChange(index, e.target.value)}
              className="px-4 py-3 text-base border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {BUZZER_SOUNDS.map((sound) => (
                <option key={sound.value} value={sound.value}>
                  {sound.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={handleComplete}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-colors"
      >
        Continue to Game
      </button>
    </div>
  )
}
