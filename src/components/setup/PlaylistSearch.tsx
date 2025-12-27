'use client'

import { useState } from 'react'
import type { SpotifyPlaylist } from '@/src/lib/spotify/types'

interface PlaylistSearchProps {
  accessToken: string
  onSelect: (playlist: SpotifyPlaylist) => void
  fetcher?: (url: string) => Promise<Response>
}

const MIN_TRACKS = 8

export function PlaylistSearch({ accessToken, onSelect, fetcher = fetch }: PlaylistSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null)

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const url = `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`
      const response = await fetcher(url)
      const data = await response.json()
      setResults(data.playlists || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    handleSearch(value)
  }

  const handleSelect = (playlist: SpotifyPlaylist) => {
    setSelected(playlist)
    onSelect(playlist)
  }

  const quickSearches = [
    { label: "🎸 Classic Rock", query: "classic rock" },
    { label: "🎵 80s Hits", query: "80s hits" },
    { label: "🎤 90s Pop", query: "90s pop" },
    { label: "🔥 Top 100", query: "top 100" },
    { label: "🎧 Party Hits", query: "party music" },
    { label: "🎹 Greatest Hits", query: "greatest hits" },
  ]

  const handleQuickSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    handleSearch(searchQuery)
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <label
          className="block text-white text-lg mb-2 font-bold"
          style={{ fontFamily: 'var(--font-righteous)' }}
        >
          Search for a Playlist
        </label>
        <input
          type="text"
          placeholder="Search for playlists..."
          value={query}
          onChange={handleInputChange}
          className="w-full px-4 py-3 text-lg border-2 border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-neon-pink"
        />
      </div>

      <div className="mb-6">
        <p className="text-gray-300 text-sm mb-3">Quick searches perfect for the game:</p>
        <div className="flex flex-wrap gap-2">
          {quickSearches.map((search) => (
            <button
              key={search.query}
              onClick={() => handleQuickSearch(search.query)}
              className="px-4 py-2 text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg"
              style={{
                backgroundColor: 'var(--neon-pink)',
                fontFamily: 'var(--font-righteous)',
                boxShadow: '0 0 10px var(--neon-pink)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hot-magenta)';
                e.currentTarget.style.boxShadow = '0 0 15px var(--hot-magenta)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--neon-pink)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--neon-pink)';
              }}
            >
              {search.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-white">Searching...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((playlist) => {
            const trackCount = playlist.tracks?.total || 0
            const isTooSmall = trackCount < MIN_TRACKS
            const isSelected = selected?.id === playlist.id

            return (
              <button
                key={playlist.id}
                onClick={() => !isTooSmall && handleSelect(playlist)}
                disabled={isTooSmall}
                title={isTooSmall ? 'Too few tracks' : ''}
                className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                  isTooSmall
                    ? 'bg-gray-900/60 border-gray-800 text-gray-600 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'bg-gray-800/80 border-neon-pink text-white'
                    : 'bg-gray-800/80 border-gray-700 text-white hover:bg-gray-700/80 hover:border-gray-600 cursor-pointer'
                }`}
                style={isSelected && !isTooSmall ? { boxShadow: '0 0 20px var(--neon-pink)' } : {}}
              >
                <div className="flex items-center gap-4">
                  {playlist.images?.[0]?.url && (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className={`w-16 h-16 rounded object-cover ${isTooSmall ? 'grayscale' : ''}`}
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-gray-300">{playlist.description}</p>
                    )}
                    {playlist.tracks && (
                      <p className={`text-sm ${isTooSmall ? 'text-red-400' : 'text-gray-400'}`}>
                        {playlist.tracks.total} tracks
                        {isTooSmall && ' (minimum 8 required)'}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No playlists found</p>
        </div>
      )}
    </div>
  )
}
