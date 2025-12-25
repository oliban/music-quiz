interface DualZoneLayoutProps {
  upperContent: React.ReactNode
  centerContent: React.ReactNode
  lowerContent: React.ReactNode
}

export function DualZoneLayout({ upperContent, centerContent, lowerContent }: DualZoneLayoutProps) {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Upper zone - rotated for teams at top */}
      <div className="h-[35%] relative overflow-hidden pointer-events-auto rotate-180">
        {upperContent}
      </div>

      {/* Subtle divider */}
      <div className="h-[1px] bg-white/20" />

      {/* Center zone - Shared content (30% height) */}
      <div className="h-[30%] relative flex items-center justify-center pointer-events-auto z-50">
        {centerContent}
      </div>

      {/* Subtle divider */}
      <div className="h-[1px] bg-white/20" />

      {/* Lower zone - for teams at bottom */}
      <div className="h-[35%] relative overflow-hidden pointer-events-auto">
        {lowerContent}
      </div>
    </div>
  )
}
