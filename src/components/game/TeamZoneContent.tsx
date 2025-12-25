'use client'

import { DraggableAnswer } from './DraggableAnswer'
import type { Team, GameQuestion } from '@/src/store/gameStore'

interface TeamZoneContentProps {
  teams: Team[]
  currentQuestion: GameQuestion | null
  answeredCorrectly: boolean
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
  onAnswerDrag,
  playedCount,
  totalTracks,
  buzzedTeam,
  isRotated = false
}: TeamZoneContentProps) {
  if (!currentQuestion) return null

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

        {/* Multiple choice buttons for drag-to-corner questions */}
        {currentQuestion.type === 'drag-to-corner' && currentQuestion.options && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-4 max-w-sm sm:max-w-md mx-auto">
            {currentQuestion.options.map((option, index) => (
              <DraggableAnswer
                key={`shared-${index}`}
                answer={option}
                onDragEnd={(answer, x, y) => onAnswerDrag(answer, x, y, '')}
                isAnswered={answeredCorrectly}
                teamId=""
                isRotated={isRotated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
