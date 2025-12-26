'use client'

import { useState, useRef, useEffect } from 'react'

interface AnswerButtonProps {
  answer: string
  onDragEnd: (answer: string, x: number, y: number) => void
  isAnswered: boolean
  isWrongAnswer?: boolean
  teamId?: string
  isRotated?: boolean
  teamColor?: string
  revealDelay?: number
}

export function AnswerButton({ answer, onDragEnd, isAnswered, isWrongAnswer = false, teamId, isRotated = false, teamColor, revealDelay = 0 }: AnswerButtonProps) {
  const [isVisible, setIsVisible] = useState(revealDelay === 0)
  const elementRef = useRef<HTMLDivElement>(null)

  // Handle reveal animation with delay
  useEffect(() => {
    setIsVisible(revealDelay === 0)

    if (revealDelay === 0) return

    const timer = setTimeout(() => {
      setIsVisible(true)
    }, revealDelay * 1000)

    return () => clearTimeout(timer)
  }, [revealDelay, answer])

  const handleClick = () => {
    // Disable interaction if not visible yet, answered, or if this is the wrong answer
    if (!isVisible || isAnswered || isWrongAnswer) return

    // Get element position for backward compatibility with zone detection
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      onDragEnd(answer, centerX, centerY)
    }
  }

  const bgColor = teamColor || 'bg-white'
  const textColor = teamColor ? 'text-white' : 'text-black'
  const isDisabled = isAnswered || isWrongAnswer

  return (
    <div
      ref={elementRef}
      className={`
        relative ${bgColor} ${textColor} p-3 sm:p-6 rounded-xl font-bold text-sm sm:text-xl
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'} select-none
        transition-all shadow-lg border-2 border-white/20
        ${!isDisabled ? 'hover:scale-105 hover:shadow-xl' : ''}
        ${isDisabled ? 'opacity-30' : ''}
        ${isWrongAnswer ? 'border-red-500 border-4' : ''}
        ${isVisible && !isDisabled ? 'animate-fadeIn' : ''}
        ${!isVisible ? 'opacity-0' : ''}
      `}
      style={{
        touchAction: 'none',
        backgroundColor: teamColor,
        animationDelay: `${revealDelay}s`,
      }}
      data-team-id={teamId}
      onClick={handleClick}
      onTouchStart={handleClick}
    >
      {isWrongAnswer ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl sm:text-4xl">✗</span>
          <span>{answer}</span>
        </div>
      ) : (
        answer
      )}
    </div>
  )
}
