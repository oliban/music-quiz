'use client'

import type { SpotifyTrack } from '@/src/lib/spotify/types'
import { TEXT_SHADOWS, BOX_SHADOWS } from '@/src/lib/styles/textShadows'

interface AlbumArtDisplayProps {
  track: SpotifyTrack
  highlightSong?: boolean
  highlightArtist?: boolean
}

export function AlbumArtDisplay({ track, highlightSong = false, highlightArtist = false }: AlbumArtDisplayProps) {
  // Get the largest album image (usually first in array)
  const albumImage = track.album.images[0]?.url

  return (
    <div className="flex flex-row items-center justify-center gap-6 sm:gap-8 animate-fadeIn pl-2 pr-8 sm:pl-4 sm:pr-12 py-8 min-w-[500px] sm:min-w-[600px]">
      {/* Album art - HERO SIZE with dramatic effects */}
      {albumImage ? (
        <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex-shrink-0">
          <img
            src={albumImage}
            alt={`${track.album.name} album art`}
            className="w-full h-full object-cover rounded-2xl border-4 sm:border-8 border-yellow-400/20"
            style={{
              boxShadow: BOX_SHADOWS.albumArt,
              aspectRatio: '1 / 1'
            }}
          />
        </div>
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
      <div className="text-left flex-1 min-w-0 max-w-none pr-4 sm:pr-8">
        {/* Song title - MASSIVE AND BOLD */}
        <div
          className={`text-3xl sm:text-4xl md:text-6xl font-black mb-2 sm:mb-3 leading-tight ${
            highlightSong ? 'text-yellow-400 animate-pulse' : 'text-gray-400'
          }`}
          style={{
            textShadow: highlightSong ? '0 0 40px rgba(251,191,36,1), 0 0 80px rgba(251,191,36,0.8), 0 0 120px rgba(251,191,36,0.6), 0 6px 30px rgba(0,0,0,0.8)' : TEXT_SHADOWS.standard
          }}
        >
          {track.name}
        </div>

        {/* Artist - PROMINENT */}
        <div
          className={`text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 ${
            highlightArtist ? 'text-yellow-400 animate-pulse' : 'text-gray-400'
          }`}
          style={{
            textShadow: highlightArtist ? '0 0 40px rgba(251,191,36,1), 0 0 80px rgba(251,191,36,0.8), 0 0 120px rgba(251,191,36,0.6), 0 6px 30px rgba(0,0,0,0.8)' : TEXT_SHADOWS.standard
          }}
        >
          {track.artists.map(a => a.name).join(', ')}
        </div>

        {/* Album - CLEAR AND READABLE */}
        <div
          className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-300"
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
