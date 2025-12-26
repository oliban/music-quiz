'use client'

import { AnswerButton } from './AnswerButton'
import type { Team, GameQuestion } from '@/src/store/gameStore'

interface TeamZoneContentProps {
  teams: Team[]
  currentQuestion: GameQuestion | null
  answeredCorrectly: boolean
  selectedWrongAnswer: string | null
  wrongAnswerTeamId: string | null
  onAnswerDrag: (answer: string, x: number, y: number, teamId: string) => void
  playedCount: number
  totalTracks: number
  buzzedTeam: string | null
  isRotated?: boolean
}

export function TeamZoneContent({
  teams,
  currentQuestion,
  answeredCorrectly,
  selectedWrongAnswer,
  wrongAnswerTeamId,
  onAnswerDrag,
  playedCount,
  totalTracks,
  buzzedTeam,
  isRotated = false
}: TeamZoneContentProps) {
  if (!currentQuestion) return null

  // Get the team for this zone (first team for upper zone, second for lower)
  const teamForZone = isRotated ? teams[0] : teams[1]

  // Check if this team answered wrong (only disable their buttons)
  const thisTeamAnsweredWrong = wrongAnswerTeamId === teamForZone?.id

  return (
    <div className="h-full w-full relative flex flex-col items-center justify-center p-2 sm:p-4 pb-24 sm:pb-20 md:pb-16">
      {/* Content container */}
      <div className="max-w-4xl w-full">
        {/* Question text */}
        <div className="text-lg sm:text-3xl text-yellow-400 font-bold mb-2 sm:mb-4 text-center">
          {currentQuestion.question}
        </div>

        {/* Instructions for buzz-in questions */}
        {currentQuestion.type === 'buzz-in' && !buzzedTeam && (
          <div className="text-white text-sm sm:text-lg mb-2 sm:mb-4 text-center">
            Touch your team zone to buzz in!
          </div>
        )}

        {/* Multiple choice buttons - Team-colored buttons with tap interaction */}
        {currentQuestion.type === 'drag-to-corner' && currentQuestion.options && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-4 max-w-sm sm:max-w-md mx-auto">
            {currentQuestion.options.map((option, index) => (
              <AnswerButton
                key={`team-${teamForZone?.id}-${index}`}
                answer={option}
                onDragEnd={(answer, x, y) => onAnswerDrag(answer, x, y, teamForZone?.id || '')}
                isAnswered={answeredCorrectly || thisTeamAnsweredWrong}
                isWrongAnswer={thisTeamAnsweredWrong && selectedWrongAnswer === option}
                teamId={teamForZone?.id}
                teamColor={teamForZone?.color}
                isRotated={isRotated}
                revealDelay={currentQuestion.optionRevealDelays?.[index] || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
