'use client'

import { useState, useEffect } from 'react'
import type { SpotifyPlaylist } from '@/src/lib/spotify/types'

interface PlaylistSearchProps {
  accessToken: string
  onSelect: (playlist: SpotifyPlaylist) => void
  fetcher?: (url: string) => Promise<Response>
}

const MIN_TRACKS = 8

const ALL_QUICK_SEARCHES = [
  { label: "🎸 Classic Rock", query: "classic rock" },
  { label: "🎵 80s Hits", query: "80s hits" },
  { label: "🎤 90s Pop", query: "90s pop" },
  { label: "🔥 Top 100", query: "top 100" },
  { label: "🎧 Party Hits", query: "party music" },
  { label: "🎹 Greatest Hits", query: "greatest hits" },
  { label: "💿 2000s Throwback", query: "2000s hits" },
  { label: "🎶 70s Classics", query: "70s music" },
  { label: "🌟 Billboard Top", query: "billboard hot 100" },
  { label: "🎺 Jazz Classics", query: "jazz classics" },
  { label: "🎸 Rock Anthems", query: "rock anthems" },
  { label: "💃 Dance Party", query: "dance party" },
  { label: "🎤 Karaoke Hits", query: "karaoke hits" },
  { label: "🏋️ Workout Music", query: "workout music" },
  { label: "🎭 Broadway Hits", query: "broadway musicals" },
  { label: "🌴 Reggae Vibes", query: "reggae classics" },
  { label: "🎸 Punk Rock", query: "punk rock" },
  { label: "🎹 Piano Classics", query: "piano classics" },
  { label: "🎺 Blues Standards", query: "blues classics" },
  { label: "🎵 Country Hits", query: "country hits" },
  { label: "🔊 Hip Hop Classics", query: "hip hop classics" },
  { label: "🎧 EDM Bangers", query: "edm hits" },
  { label: "🎸 Metal Essentials", query: "metal music" },
  { label: "🌊 Indie Vibes", query: "indie rock" },
  { label: "🎤 R&B Classics", query: "r&b classics" },
  { label: "🎵 Soul Music", query: "soul classics" },
  { label: "🎹 Funk Grooves", query: "funk classics" },
  { label: "🎸 Alternative Rock", query: "alternative rock" },
  { label: "🎺 Big Band", query: "big band swing" },
  { label: "🎵 Motown Hits", query: "motown classics" },
  { label: "🎤 Diva Anthems", query: "diva pop" },
  { label: "🔥 Rap Battles", query: "rap hits" },
  { label: "🎸 Grunge Era", query: "grunge 90s" },
  { label: "💿 Disco Fever", query: "disco classics" },
  { label: "🎧 Electronic", query: "electronic music" },
  { label: "🎵 Folk Music", query: "folk classics" },
  { label: "🌟 One Hit Wonders", query: "one hit wonders" },
  { label: "🎸 Guitar Heroes", query: "guitar rock" },
  { label: "🎤 Power Ballads", query: "power ballads" },
  { label: "🎹 Synth Pop", query: "synth pop 80s" },
  { label: "🔊 Trap Music", query: "trap music" },
  { label: "🎺 Latin Hits", query: "latin hits" },
  { label: "🎵 K-Pop", query: "kpop hits" },
  { label: "🎸 British Invasion", query: "british invasion 60s" },
  { label: "🌴 Tropical House", query: "tropical house" },
  { label: "🎤 Emo Classics", query: "emo 2000s" },
  { label: "🎧 Trance Anthems", query: "trance music" },
  { label: "🎵 Acoustic Covers", query: "acoustic covers" },
  { label: "🔥 Summer Anthems", query: "summer hits" },
  { label: "❄️ Christmas Hits", query: "christmas music" },
  { label: "🎃 Halloween Party", query: "halloween party" },
  { label: "💘 Love Songs", query: "romantic love songs" },
  { label: "💔 Breakup Songs", query: "breakup songs" },
  { label: "🎸 Southern Rock", query: "southern rock" },
  { label: "🎺 Ska Punk", query: "ska punk" },
  { label: "🎵 Bluegrass", query: "bluegrass music" },
  { label: "🎤 Girl Power", query: "girl power anthems" },
  { label: "🎸 Boy Bands", query: "boy bands 90s" },
  { label: "🌟 Eurovision Hits", query: "eurovision songs" },
  { label: "🎧 Lo-fi Beats", query: "lofi hip hop" },
  { label: "🎹 Vaporwave", query: "vaporwave" },
  { label: "🔊 Dubstep", query: "dubstep" },
  { label: "🎵 Reggaeton", query: "reggaeton hits" },
  { label: "🎤 Neo Soul", query: "neo soul" },
  { label: "🎸 Shoegaze", query: "shoegaze" },
  { label: "🎺 Bossa Nova", query: "bossa nova" },
  { label: "🎵 Afrobeat", query: "afrobeat" },
  { label: "🔥 Workout Pump", query: "gym workout" },
  { label: "🏃 Running Mix", query: "running music" },
  { label: "🚗 Road Trip", query: "road trip playlist" },
  { label: "🎉 Wedding Songs", query: "wedding reception" },
  { label: "🎓 Graduation", query: "graduation songs" },
  { label: "🌅 Morning Vibes", query: "morning music" },
  { label: "🌙 Night Driving", query: "night drive" },
  { label: "☕ Coffee Shop", query: "coffee shop music" },
  { label: "🏖️ Beach Party", query: "beach party" },
  { label: "🎸 Hard Rock", query: "hard rock" },
  { label: "🎤 Female Vocals", query: "female vocalists" },
  { label: "🎵 Male Vocalists", query: "male singers" },
  { label: "🎹 Instrumental", query: "instrumental music" },
  { label: "🔊 Bass Boosted", query: "bass music" },
  { label: "🎧 House Music", query: "house music" },
  { label: "🎺 Techno Beats", query: "techno" },
  { label: "🎵 Ambient Chill", query: "ambient music" },
  { label: "🌟 Viral Hits", query: "viral tiktok songs" },
  { label: "🎸 Garage Rock", query: "garage rock" },
  { label: "🎤 Mumble Rap", query: "mumble rap" },
  { label: "🎹 Synthwave", query: "synthwave" },
  { label: "🔥 Hype Music", query: "hype songs" },
  { label: "🎵 Sad Songs", query: "sad emotional songs" },
  { label: "😊 Happy Vibes", query: "happy upbeat music" },
  { label: "🎸 Jam Bands", query: "jam bands" },
  { label: "🎺 New Wave", query: "new wave 80s" },
  { label: "🎤 Post Punk", query: "post punk" },
  { label: "🎹 Dream Pop", query: "dream pop" },
  { label: "🔊 Drum & Bass", query: "drum and bass" },
  { label: "🎵 Gospel Music", query: "gospel music" },
  { label: "🌟 Teen Pop", query: "teen pop" },
  { label: "🎸 Psychedelic", query: "psychedelic rock" },
]

function getRandomQuickSearches(count: number): typeof ALL_QUICK_SEARCHES {
  const shuffled = [...ALL_QUICK_SEARCHES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function PlaylistSearch({ accessToken, onSelect, fetcher = fetch }: PlaylistSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null)
  const [quickSearches, setQuickSearches] = useState<typeof ALL_QUICK_SEARCHES>([])
  const [error403, setError403] = useState(false)

  useEffect(() => {
    // Randomize 6-7 quick searches on component mount
    const randomCount = Math.random() < 0.5 ? 6 : 7
    setQuickSearches(getRandomQuickSearches(randomCount))
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setError403(false)
      return
    }

    setLoading(true)
    setError403(false)  // Reset on new search

    try {
      const url = `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`
      const response = await fetcher(url)
      const data = await response.json()

      // Check for 403 authorization error
      if (response.status === 403 || data.isAuthorizationError) {
        setError403(true)
        setResults([])
      } else {
        setResults(data.playlists || [])
      }
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

  const handleQuickSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    handleSearch(searchQuery)
  }

  const handleRandomize = () => {
    const randomCount = Math.random() < 0.5 ? 6 : 7
    setQuickSearches(getRandomQuickSearches(randomCount))
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎵</span>
          <label
            className="text-white text-xl font-bold"
            style={{ fontFamily: 'var(--font-righteous)' }}
          >
            Search for a Playlist
          </label>
        </div>
        <input
          type="text"
          placeholder="Search for playlists..."
          value={query}
          onChange={handleInputChange}
          className="w-full px-4 py-3 text-lg border-2 border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-neon-pink"
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-300 text-sm">Quick searches perfect for the game:</p>
          <button
            onClick={handleRandomize}
            className="p-1.5 text-2xl transition-all transform hover:scale-110 active:scale-95 rounded"
            title="Randomize suggestions"
            style={{
              backgroundColor: 'transparent',
            }}
          >
            🎲
          </button>
        </div>
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

      {error403 && (
        <div className="bg-red-900/30 border-2 border-red-500/50 rounded-lg p-6 text-center mb-4">
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="text-xl font-bold text-red-400 mb-2"
              style={{ fontFamily: 'var(--font-righteous)' }}>
            Access Restricted
          </h3>
          <p className="text-red-200 mb-3">
            This Spotify app is in Development Mode and you're not on the allowed users list.
          </p>
          <p className="text-red-100 font-semibold">
            Please contact the app author to be added to the whitelist.
          </p>
        </div>
      )}

      {!loading && !error403 && query && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No playlists found</p>
        </div>
      )}
    </div>
  )
}
