'use client'

import type { Team } from '@/src/store/gameStore'

interface ScoreBoardProps {
  teams: Team[]
  rotated?: boolean
}

export function ScoreBoard({ teams, rotated = false }: ScoreBoardProps) {
  // Sort teams by score (highest first)
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score)

  return (
    <div className={`bg-black/70 backdrop-blur-sm rounded px-2 py-1 w-32 ${rotated ? 'rotate-180' : ''}`}>
      <div className="space-y-0.5">
        {sortedTeams.map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between px-1 py-0.5 rounded text-xs"
            style={{
              backgroundColor: `${team.color}15`,
              borderLeft: `2px solid ${team.color}`,
            }}
          >
            <span className="font-semibold text-white truncate flex-1">{team.name}</span>
            <span
              className="font-bold text-sm ml-1"
              style={{ color: team.color }}
            >
              {team.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
