'use client'

import { useState } from 'react'
import { useGameStore } from '@/src/store/gameStore'
import type { Team } from '@/src/store/gameStore'

const TEAM_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
]

interface TeamSetupProps {
  onComplete: () => void
}

export function TeamSetup({ onComplete }: TeamSetupProps) {
  const [teamCount, setTeamCount] = useState(4)
  const [teamNames, setTeamNames] = useState<string[]>(
    Array(4).fill('').map((_, i) => `Team ${i + 1}`)
  )
  const setTeams = useGameStore((state) => state.setTeams)
  const setupTouchZones = useGameStore((state) => state.setupTouchZones)

  const handleTeamCountChange = (count: number) => {
    setTeamCount(count)
    const newNames = Array(count)
      .fill('')
      .map((_, i) => teamNames[i] || `Team ${i + 1}`)
    setTeamNames(newNames)
  }

  const handleTeamNameChange = (index: number, name: string) => {
    const newNames = [...teamNames]
    newNames[index] = name
    setTeamNames(newNames)
  }

  const handleComplete = () => {
    const teams: Team[] = teamNames.map((name, index) => ({
      id: `team-${index + 1}`,
      name: name || `Team ${index + 1}`,
      score: 0,
      color: TEAM_COLORS[index],
    }))

    setTeams(teams)
    setupTouchZones()
    onComplete()
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold text-white mb-6">Team Setup</h2>

      <div className="mb-8">
        <label className="block text-white text-lg mb-4">Number of Teams (max 6)</label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((count) => (
            <button
              key={count}
              onClick={() => handleTeamCountChange(count)}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                teamCount === count
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {teamNames.map((name, index) => (
          <div key={index} className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: TEAM_COLORS[index] }}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => handleTeamNameChange(index, e.target.value)}
              placeholder={`Team ${index + 1}`}
              className="flex-1 px-4 py-3 text-lg border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
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
