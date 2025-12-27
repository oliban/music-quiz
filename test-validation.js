// Test script for playlist validation
const { QuestionGenerator } = require('./src/lib/game/questionGenerator.ts')

// Create a small playlist with only 5 tracks (below minimum of 8)
const smallPlaylist = [
  {
    id: '1',
    name: 'Song 1',
    artists: [{ name: 'Artist A' }],
    album: { name: 'Album 1' },
    uri: 'spotify:track:1'
  },
  {
    id: '2',
    name: 'Song 2',
    artists: [{ name: 'Artist A' }],
    album: { name: 'Album 2' },
    uri: 'spotify:track:2'
  },
  {
    id: '3',
    name: 'Song 3',
    artists: [{ name: 'Artist B' }],
    album: { name: 'Album 3' },
    uri: 'spotify:track:3'
  },
  {
    id: '4',
    name: 'Song 4',
    artists: [{ name: 'Artist B' }],
    album: { name: 'Album 4' },
    uri: 'spotify:track:4'
  },
  {
    id: '5',
    name: 'Song 5',
    artists: [{ name: 'Artist C' }],
    album: { name: 'Album 5' },
    uri: 'spotify:track:5'
  }
]

console.log('\n=== Testing Playlist Validation ===\n')
console.log(`Playlist size: ${smallPlaylist.length} tracks`)

try {
  const generator = new QuestionGenerator({
    tracks: smallPlaylist
  })

  console.log(`\nValidation result: ${generator.isValid() ? '✓ VALID' : '✗ INVALID'}`)

  const warnings = generator.getWarnings()
  if (warnings.length > 0) {
    console.log('\nWarnings:')
    warnings.forEach(warning => {
      console.log(`  - ${warning}`)
    })
  }

  if (!generator.isValid()) {
    console.log('\n✓ SUCCESS: Validation correctly blocked small playlist!')
  } else {
    console.log('\n✗ FAILURE: Validation should have blocked this playlist!')
  }
} catch (error) {
  console.error('Error:', error.message)
}

console.log('\n')
