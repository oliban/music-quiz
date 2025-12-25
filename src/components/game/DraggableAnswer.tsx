'use client'

import { useState, useRef, useEffect } from 'react'

interface DraggableAnswerProps {
  answer: string
  onDragEnd: (answer: string, x: number, y: number) => void
  isAnswered: boolean
  teamId?: string
}

export function DraggableAnswer({ answer, onDragEnd, isAnswered, teamId }: DraggableAnswerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  const elementRef = useRef<HTMLDivElement>(null)

  const handleStart = (clientX: number, clientY: number) => {
    if (isAnswered) return

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

  return (
    <div
      ref={elementRef}
      className={`
        relative bg-white text-black p-6 rounded-xl font-bold text-xl
        cursor-grab active:cursor-grabbing select-none
        transition-transform shadow-lg
        ${isDragging ? 'scale-110 shadow-2xl z-50' : ''}
        ${isAnswered ? 'opacity-30 cursor-not-allowed' : ''}
      `}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none',
      }}
      data-team-id={teamId}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {answer}
    </div>
  )
}
