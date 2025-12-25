'use client'

import type { SpotifyTrack } from '@/src/lib/spotify/types'

interface AlbumArtDisplayProps {
  track: SpotifyTrack
}

export function AlbumArtDisplay({ track }: AlbumArtDisplayProps) {
  // Get the largest album image (usually first in array)
  const albumImage = track.album.images[0]?.url

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 animate-fadeIn px-3 sm:px-8">
      {/* Album art with dramatic effects */}
      {albumImage ? (
        <img
          src={albumImage}
          alt={`${track.album.name} album art`}
          className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-lg sm:rounded-xl border-2 sm:border-4 border-white/10 flex-shrink-0"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.6), 0 30px 90px rgba(0,0,0,0.4)'
          }}
        />
      ) : (
        <div
          className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-gray-800 rounded-lg sm:rounded-xl border-2 sm:border-4 border-white/10 flex items-center justify-center flex-shrink-0"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.6), 0 30px 90px rgba(0,0,0,0.4)'
          }}
        >
          <span className="text-gray-400 text-4xl sm:text-5xl md:text-6xl">🎵</span>
        </div>
      )}

      {/* Track and artist info with clear hierarchy */}
      <div className="text-center sm:text-left flex-1 min-w-0 w-full">
        {/* Song title - largest and most prominent */}
        <div
          className="text-xl sm:text-2xl md:text-3xl font-black text-yellow-400 mb-1 sm:mb-2 leading-tight line-clamp-2"
          style={{
            textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(251,191,36,0.5), 0 2px 4px rgba(0,0,0,1)'
          }}
        >
          {track.name}
        </div>

        {/* Artist - secondary */}
        <div
          className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 line-clamp-1"
          style={{
            textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,1)'
          }}
        >
          {track.artists.map(a => a.name).join(', ')}
        </div>

        {/* Album - tertiary */}
        <div
          className="text-sm sm:text-base font-semibold text-gray-300 line-clamp-1"
          style={{
            textShadow: '0 1px 4px rgba(0,0,0,0.6)'
          }}
        >
          {track.album.name}
        </div>
      </div>
    </div>
  )
}
