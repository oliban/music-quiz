'use client'

import type { SpotifyTrack } from '@/src/lib/spotify/types'
import { TEXT_SHADOWS, BOX_SHADOWS } from '@/src/lib/styles/textShadows'

interface AlbumArtDisplayProps {
  track: SpotifyTrack
}

export function AlbumArtDisplay({ track }: AlbumArtDisplayProps) {
  // Get the largest album image (usually first in array)
  const albumImage = track.album.images[0]?.url

  return (
    <div className="flex flex-row items-center justify-center gap-6 sm:gap-8 animate-fadeIn px-4 sm:px-8 py-8">
      {/* Album art - HERO SIZE with dramatic effects */}
      {albumImage ? (
        <img
          src={albumImage}
          alt={`${track.album.name} album art`}
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl border-4 sm:border-8 border-yellow-400/20 flex-shrink-0"
          style={{
            boxShadow: BOX_SHADOWS.albumArt
          }}
        />
      ) : (
        <div
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gray-800 rounded-2xl border-4 sm:border-8 border-yellow-400/20 flex items-center justify-center flex-shrink-0"
          style={{
            boxShadow: BOX_SHADOWS.albumArtFallback
          }}
        >
          <span className="text-gray-400 text-8xl sm:text-9xl">🎵</span>
        </div>
      )}

      {/* Track and artist info - HERO TYPOGRAPHY on the right */}
      <div className="text-left flex-1 min-w-0 max-w-2xl">
        {/* Song title - MASSIVE AND BOLD */}
        <div
          className="text-2xl sm:text-3xl md:text-5xl font-black text-yellow-400 mb-2 sm:mb-4 leading-tight"
          style={{
            textShadow: TEXT_SHADOWS.hero
          }}
        >
          {track.name}
        </div>

        {/* Artist - PROMINENT */}
        <div
          className="text-lg sm:text-xl md:text-3xl font-bold text-white mb-1 sm:mb-2"
          style={{
            textShadow: TEXT_SHADOWS.prominent
          }}
        >
          {track.artists.map(a => a.name).join(', ')}
        </div>

        {/* Album - CLEAR AND READABLE */}
        <div
          className="text-base sm:text-lg md:text-xl font-semibold text-gray-300"
          style={{
            textShadow: TEXT_SHADOWS.standard
          }}
        >
          {track.album.name}
        </div>
      </div>
    </div>
  )
}
