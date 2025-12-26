'use client'

import { useState, useRef, useEffect } from 'react'

interface DraggableAnswerProps {
  answer: string
  onDragEnd: (answer: string, x: number, y: number) => void
  isAnswered: boolean
  isWrongAnswer?: boolean
  teamId?: string
  isRotated?: boolean
  teamColor?: string
  useTapMode?: boolean
  revealDelay?: number
}

export function DraggableAnswer({ answer, onDragEnd, isAnswered, isWrongAnswer = false, teamId, isRotated = false, teamColor, useTapMode = false, revealDelay = 0 }: DraggableAnswerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(revealDelay === 0)
  const startPos = useRef({ x: 0, y: 0 })
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

  const handleStart = (clientX: number, clientY: number) => {
    // Disable interaction if not visible yet, answered, or if this is the wrong answer
    if (!isVisible || isAnswered || isWrongAnswer) return

    // In tap mode, immediately trigger the answer selection
    if (useTapMode) {
      onDragEnd(answer, clientX, clientY)
      return
    }

    setIsDragging(true)

    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect()
      const offsetX = clientX - rect.left
      const offsetY = clientY - rect.top
      setOffset({ x: offsetX, y: offsetY })
      startPos.current = { x: rect.left, y: rect.top }
    }
  }

  // Global mouse event handlers for desktop
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      if (isAnswered) return

      const newX = e.clientX - offset.x - startPos.current.x
      const newY = e.clientY - offset.y - startPos.current.y
      setPosition({ x: newX, y: newY })
    }

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isAnswered) return

      setIsDragging(false)

      // Get final position and check if dropped on a corner
      onDragEnd(answer, e.clientX, e.clientY)

      // Reset position
      setPosition({ x: 0, y: 0 })
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, offset, isAnswered, answer, onDragEnd])

  const handleMove = (clientX: number, clientY: number) => {
    if (isAnswered) return

    const newX = clientX - offset.x - startPos.current.x
    const newY = clientY - offset.y - startPos.current.y
    setPosition({ x: newX, y: newY })
  }

  const handleEnd = (clientX: number, clientY: number) => {
    if (isAnswered) return

    setIsDragging(false)

    // Get final position
    const finalX = clientX
    const finalY = clientY

    // Check if dropped on a corner
    onDragEnd(answer, finalX, finalY)

    // Reset position
    setPosition({ x: 0, y: 0 })
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    handleEnd(touch.clientX, touch.clientY)
  }

  // Invert position for rotated zones so drag direction matches visual expectation
  const visualX = isRotated ? -position.x : position.x
  const visualY = isRotated ? -position.y : position.y

  const bgColor = teamColor || 'bg-white'
  const textColor = teamColor ? 'text-white' : 'text-black'
  const cursor = useTapMode ? 'cursor-pointer active:scale-95' : 'cursor-grab active:cursor-grabbing'
  const isDisabled = isAnswered || isWrongAnswer

  return (
    <div
      ref={elementRef}
      className={`
        relative ${bgColor} ${textColor} p-3 sm:p-6 rounded-xl font-bold text-sm sm:text-xl
        ${isDisabled ? 'cursor-not-allowed' : cursor} select-none
        transition-all shadow-lg border-2 border-white/20
        ${isDragging ? 'scale-110 shadow-2xl z-[9999]' : ''}
        ${useTapMode && !isDisabled ? 'hover:scale-105 hover:shadow-xl' : ''}
        ${isDisabled ? 'opacity-30' : ''}
        ${isWrongAnswer ? 'border-red-500 border-4' : ''}
        ${isVisible && !isDisabled ? (useTapMode ? 'animate-fadeIn' : 'animate-fadeInNoDrag') : ''}
        ${!isVisible ? 'opacity-0' : ''}
      `}
      style={{
        transform: useTapMode ? undefined : `translate(${visualX}px, ${visualY}px)`,
        touchAction: 'none',
        backgroundColor: teamColor,
        animationDelay: `${revealDelay}s`,
      }}
      data-team-id={teamId}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={useTapMode ? undefined : handleTouchMove}
      onTouchEnd={useTapMode ? undefined : handleTouchEnd}
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
