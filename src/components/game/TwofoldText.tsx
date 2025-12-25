interface TwofoldTextProps {
  children: React.ReactNode
  className?: string
}

export function TwofoldText({ children, className = '' }: TwofoldTextProps) {
  return (
    <div className="relative w-full">
      <div className={`text-center ${className}`}>{children}</div>
      <div className={`text-center rotate-180 ${className}`}>{children}</div>
    </div>
  )
}
