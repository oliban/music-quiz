'use client'

import { useState, useEffect } from 'react'

const TEAM_COLORS = [
  '#00D9FF', // electric-blue
  '#FF007A', // hot-magenta
]

const TEAM_NAME_SUGGESTIONS = [
  'The Beatlemaniacs',
  'Disco Inferno',
  'Rhythm Rebels',
  'The Headbangers',
  'Karaoke Kings',
  'Vinyl Villains',
  'The Showstoppers',
  'Bass Droppers',
  'Treble Makers',
  'The Mixtapes',
  'Acoustic Chaos',
  'The Earworms',
  'Playlist Pirates',
  'The Crescendos',
  'Dancing Queens',
  'The One-Hit Wonders',
  'Rockstars Anonymous',
  'The Jukebox Heroes',
  'Pitch Perfect',
  'The Garage Band',
  'Music Nerds Unite',
  'The Sound Waves',
  'Party Animals',
  'The Song Birds',
  'Freestyle Fanatics',
  'The Chart Toppers',
  'Melody Makers',
  'The Groove Squad',
  'Harmony Hooligans',
  'The Backstreet Bois',
  'Lyric Legends',
  'The Track Stars',
  'Amp It Up',
  'The Riff Raff',
  'Shower Singers',
  'The Note-orious',
  'Decibel Rebels',
  'The Tune Squad',
  'Rhythm & Booze',
  'The Falsetto Fiends',
  'Song Slayers',
  'The Beat Freaks',
  'Air Guitar Heroes',
  'The Volume Knobs',
  'Kazoo Crew',
  'The Track Attackers',
  'Festival Fanatics',
  'The Mosh Pit',
  'Spotify Stalkers',
  'The Playlist Pros',
]

const BUZZER_SOUNDS = [
  { label: '🚗 Car Horn', value: '/sounds/automobile-horn.mp3' },
  { label: '🔔 Bell Ring', value: '/sounds/bell-ring.mp3' },
  { label: '🛎️ Bell', value: '/sounds/bell.mp3' },
  { label: '🚢 Boat Horn', value: '/sounds/boat-horn.mp3' },
  { label: '😱 Yell', value: '/sounds/short-ah-yell.mp3' },
  { label: '📯 Horn', value: '/sounds/short-horn.mp3' },
]

function getRandomTeamNames(count: number): string[] {
  const shuffled = [...TEAM_NAME_SUGGESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function getRandomSound(excludeSound?: string): string {
  const availableSounds = BUZZER_SOUNDS.filter(s => s.value !== excludeSound)
  const randomIndex = Math.floor(Math.random() * availableSounds.length)
  return availableSounds[randomIndex].value
}

export interface TeamDraft {
  names: string[]
  sounds: string[]
}

interface TeamSetupProps {
  onChange: (draft: TeamDraft) => void
  initialNames?: string[]
  initialSounds?: string[]
}

export function TeamSetup({ onChange, initialNames, initialSounds }: TeamSetupProps) {
  const [teamNames, setTeamNames] = useState<string[]>(() => initialNames || getRandomTeamNames(2))
  const [teamSounds, setTeamSounds] = useState<string[]>(() => {
    if (initialSounds) return initialSounds
    const firstSound = getRandomSound()
    const secondSound = getRandomSound(firstSound)
    return [firstSound, secondSound]
  })

  // Notify parent of changes
  useEffect(() => {
    onChange({ names: teamNames, sounds: teamSounds })
  }, [teamNames, teamSounds, onChange])

  const handleTeamNameChange = (index: number, name: string) => {
    const newNames = [...teamNames]
    newNames[index] = name
    setTeamNames(newNames)
  }

  const handleRandomizeTeam = (index: number) => {
    // Get a new random name (excluding current name)
    const availableNames = TEAM_NAME_SUGGESTIONS.filter(name => name !== teamNames[index])
    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)]

    // Get a new random sound (excluding the other team's sound)
    const otherTeamIndex = index === 0 ? 1 : 0
    const newSound = getRandomSound(teamSounds[otherTeamIndex])

    const newNames = [...teamNames]
    newNames[index] = randomName
    setTeamNames(newNames)

    const newSounds = [...teamSounds]
    newSounds[index] = newSound
    setTeamSounds(newSounds)

    // Auto-play preview
    const audio = new Audio(`${newSound}?v=${Date.now()}`)
    audio.play().catch(err => console.warn('Sound preview failed:', err))
  }

  const handleTeamSoundChange = (index: number, sound: string) => {
    const newSounds = [...teamSounds]
    newSounds[index] = sound
    setTeamSounds(newSounds)

    // Auto-play preview with cache-busting
    const audio = new Audio(`${sound}?v=${Date.now()}`)
    audio.play().catch(err => console.warn('Sound preview failed:', err))
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">👥</span>
        <h2
          className="text-xl font-bold text-white"
          style={{ fontFamily: 'var(--font-righteous)' }}
        >
          Team Setup
        </h2>
      </div>

      <div className="space-y-12 mb-6">
        {teamNames.map((name, index) => {
          const otherTeamIndex = index === 0 ? 1 : 0

          return (
            <div key={index} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleTeamNameChange(index, e.target.value)}
                  placeholder={`Team ${index + 1}`}
                  className="flex-1 px-3 py-2.5 text-lg border-2 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-white/50"
                  style={{
                    borderColor: TEAM_COLORS[index],
                    backgroundColor: `${TEAM_COLORS[index]}40`, // 40 = 25% opacity in hex
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRandomizeTeam(index)}
                  className="px-3 py-2.5 text-2xl border-2 border-gray-600 rounded-lg bg-gray-800 hover:bg-gray-700 hover:border-gray-500 transition-all active:scale-95"
                  title="Randomize team name and sound"
                >
                  🎲
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Buzzer Sound:</label>
                <div className="flex gap-1">
                  {BUZZER_SOUNDS.map((sound) => {
                    const isOtherTeamSound = teamSounds[otherTeamIndex] === sound.value
                    const isCurrentTeamSound = teamSounds[index] === sound.value

                    return (
                      <button
                        key={sound.value}
                        type="button"
                        onClick={() => !isOtherTeamSound && handleTeamSoundChange(index, sound.value)}
                        disabled={isOtherTeamSound}
                        className={`p-1.5 text-xl rounded border-2 transition-all ${
                          isCurrentTeamSound
                            ? 'border-green-500 bg-green-500/20 ring-1 ring-green-400'
                            : isOtherTeamSound
                            ? 'border-gray-700 bg-gray-900 opacity-30 cursor-not-allowed'
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:scale-110 active:scale-95'
                        }`}
                        title={isOtherTeamSound ? `${sound.label} (taken by other team)` : sound.label}
                      >
                        {sound.label.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
