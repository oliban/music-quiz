import type { SpotifyTrack } from '../spotify/types'
import type { GameQuestion } from '@/src/store/gameStore'
import { LastFmClient } from '../lastfm/api'
import { deduplicateStrings, shuffleArray } from '../utils/deduplication'

export interface QuestionGeneratorOptions {
  tracks: SpotifyTrack[]
  lastFmApiKey?: string
  dominantArtists?: string[]
}

export class QuestionGenerator {
  private tracks: SpotifyTrack[]
  private lastFmClient: LastFmClient | null
  private validationResult: { isValid: boolean; warnings: string[] }
  private dominantArtists: string[]

  constructor(options: QuestionGeneratorOptions) {
    this.tracks = options.tracks
    this.lastFmClient = options.lastFmApiKey
      ? new LastFmClient(options.lastFmApiKey)
      : null
    this.dominantArtists = options.dominantArtists || []
    this.validationResult = this.validatePlaylistData()
  }

  // Public validation methods
  public isValid(): boolean {
    return this.validationResult.isValid
  }

  public getWarnings(): string[] {
    return this.validationResult.warnings
  }

  private validatePlaylistData(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = []

    // Check minimum track count
    if (this.tracks.length < 8) {
      warnings.push(`Playlist too small (${this.tracks.length} tracks). Minimum 8 tracks required for quality questions.`)
      return { isValid: false, warnings }
    }

    // Check unique song names
    const uniqueSongNames = new Set(this.tracks.map(t => t.name.toLowerCase().trim()))
    if (uniqueSongNames.size < 4) {
      warnings.push(`Not enough unique song titles (${uniqueSongNames.size}). Need at least 4 for song title questions.`)
    }

    // Check unique artists
    const uniqueArtists = new Set(
      this.tracks.flatMap(t => t.artists.map(a => a.name.toLowerCase().trim()))
    )
    if (uniqueArtists.size < 4) {
      warnings.push(`Not enough unique artists (${uniqueArtists.size}). Need at least 4 for artist questions.`)
    }

    // If we have enough tracks but specific question types are limited, still allow game
    // as long as at least one question type is available
    const hasValidQuestionTypes = uniqueSongNames.size >= 4 || uniqueArtists.size >= 4

    if (!hasValidQuestionTypes) {
      warnings.push('Insufficient unique content for any question type.')
      return { isValid: false, warnings }
    }

    return { isValid: true, warnings }
  }

  private generateOptionRevealDelays(optionCount: number): number[] {
    // 40% chance: all options appear instantly
    if (Math.random() < 0.4) {
      return Array(optionCount).fill(0)
    }

    // 60% chance: staggered reveals in 2-3 waves between 2-5 seconds
    const waveCount = Math.random() < 0.5 ? 2 : 3
    const waveTimes: number[] = []

    // Generate wave timings
    for (let i = 0; i < waveCount; i++) {
      if (i === 0) {
        // First wave: 30% chance at 0s, otherwise 2-3s
        waveTimes.push(Math.random() < 0.3 ? 0 : 2 + Math.random())
      } else if (i === 1) {
        // Second wave: 2.5-4s
        waveTimes.push(2.5 + Math.random() * 1.5)
      } else {
        // Third wave: 3.5-5s
        waveTimes.push(3.5 + Math.random() * 1.5)
      }
    }

    // Sort wave times to ensure proper ordering
    waveTimes.sort((a, b) => a - b)

    // Distribute options across waves randomly
    const delays: number[] = []
    const shuffledIndices = Array.from({ length: optionCount }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
    const optionsPerWave = Math.ceil(optionCount / waveCount)

    for (let i = 0; i < optionCount; i++) {
      const waveIndex = Math.min(Math.floor(i / optionsPerWave), waveCount - 1)
      delays[shuffledIndices[i]] = waveTimes[waveIndex]
    }

    return delays
  }

  async generateQuestion(currentTrack: SpotifyTrack, questionIndex: number): Promise<GameQuestion> {
    const questionType: 'buzz-in' | 'drag-to-corner' = questionIndex % 2 === 0 ? 'buzz-in' : 'drag-to-corner'

    if (questionType === 'buzz-in') {
      return this.generateBuzzInQuestion(currentTrack)
    } else {
      return await this.generateDragToCornerQuestion(currentTrack)
    }
  }

  private generateBuzzInQuestion(track: SpotifyTrack): GameQuestion {
    const questions = [
      {
        question: 'Name this song!',
        correctAnswer: track.name,
      },
    ]

    // Check if this track is from any dominant artist
    const trackArtist = track.artists[0]?.name.toLowerCase().trim()
    const isDominantArtist = this.dominantArtists.includes(trackArtist)

    // Only add artist question if track is NOT from a dominant artist
    if (!isDominantArtist) {
      questions.push({
        question: 'Who is the artist?',
        correctAnswer: track.artists[0]?.name || 'Unknown',
      })
    }

    const selected = questions[Math.floor(Math.random() * questions.length)]

    return {
      type: 'buzz-in',
      track,
      question: selected.question,
      correctAnswer: selected.correctAnswer,
    }
  }

  private async getAvailableQuestionTypes(track: SpotifyTrack): Promise<Array<{
    question: string
    correctAnswer: string
    generateWrongAnswers: () => Promise<string[]> | string[]
  }>> {
    const questionTypes: Array<{
      question: string
      correctAnswer: string
      generateWrongAnswers: () => Promise<string[]> | string[]
    }> = []

    // Song title questions - need 4+ unique song names
    const uniqueSongNames = new Set(this.tracks.map(t => t.name.toLowerCase().trim()))
    if (uniqueSongNames.size >= 4) {
      questionTypes.push({
        question: 'Which is the correct song title?',
        correctAnswer: track.name,
        generateWrongAnswers: () => this.getRandomTrackNames(3, track.id),
      })
    }

    // Artist questions - need 4+ unique artists
    // Only add if track is NOT from a dominant artist
    const trackArtist = track.artists[0]?.name.toLowerCase().trim()
    const isDominantArtist = this.dominantArtists.includes(trackArtist)

    if (!isDominantArtist) {
      const uniqueArtists = new Set(
        this.tracks.flatMap(t => t.artists.map(a => a.name.toLowerCase().trim()))
      )
      if (uniqueArtists.size >= 4) {
        questionTypes.push({
          question: 'Who is the artist?',
          correctAnswer: track.artists[0]?.name || 'Unknown',
          generateWrongAnswers: () => this.getRandomArtists(3, track.artists[0]?.name),
        })
      }
    }

    // Add trivia questions if Last.fm is available
    if (this.lastFmClient) {
      // Genre/Tag question
      const tags = await this.lastFmClient.getTopTags(
        track.artists[0]?.name || '',
        track.name
      )

      if (tags.length > 0) {
        const correctTag = tags[0]
        questionTypes.push({
          question: 'What genre/style is this song?',
          correctAnswer: correctTag,
          generateWrongAnswers: async () => {
            // Get tags from other random tracks
            const otherTags: string[] = []
            const randomTracks = this.getRandomItems(
              this.tracks.filter(t => t.id !== track.id),
              3
            )

            for (const t of randomTracks) {
              const trackTags = await this.lastFmClient!.getTopTags(
                t.artists[0]?.name || '',
                t.name
              )
              if (trackTags.length > 0) {
                otherTags.push(trackTags[0])
              }
            }

            return [...new Set(otherTags)].slice(0, 3)
          },
        })
      }
    }

    return questionTypes
  }

  private async generateDragToCornerQuestion(track: SpotifyTrack): Promise<GameQuestion> {
    const questionTypes = await this.getAvailableQuestionTypes(track)

    if (questionTypes.length === 0) {
      throw new Error('Insufficient data for any question type')
    }

    const selected = questionTypes[Math.floor(Math.random() * questionTypes.length)]
    const wrongAnswers = await selected.generateWrongAnswers()

    // Validate and ensure unique wrong answers
    const validatedWrongAnswers = this.ensureUniqueWrongAnswers(
      selected.correctAnswer,
      wrongAnswers,
      3
    )

    // If insufficient unique answers, try another question type
    if (!validatedWrongAnswers) {
      return this.generateDragToCornerQuestion(track)
    }

    const options = shuffleArray([selected.correctAnswer, ...validatedWrongAnswers])
    const optionRevealDelays = this.generateOptionRevealDelays(options.length)

    return {
      type: 'drag-to-corner',
      track,
      question: selected.question,
      correctAnswer: selected.correctAnswer,
      options,
      optionRevealDelays,
    }
  }

  private getRandomTrackNames(count: number, excludeId: string): string[] {
    // Filter out current track
    const otherTracks = this.tracks.filter((t) => t.id !== excludeId)
    // Deduplicate by name (case-insensitive)
    const uniqueNames = deduplicateStrings(otherTracks.map(t => t.name))
    return this.getRandomItems(uniqueNames, count)
  }

  private getRandomArtists(count: number, excludeName?: string): string[] {
    const artists = this.tracks
      .flatMap((t) => t.artists)
      .filter((a) => a.name !== excludeName)
      .map((a) => a.name)
    const unique = [...new Set(artists)]
    return this.getRandomItems(unique, count)
  }

  private getRandomAlbums(count: number, excludeName?: string): string[] {
    const albums = this.tracks
      .map((t) => t.album?.name)
      .filter((name): name is string => name !== undefined && name !== excludeName)
    const unique = [...new Set(albums)]
    return this.getRandomItems(unique, count)
  }

  private ensureUniqueWrongAnswers(
    correctAnswer: string,
    wrongAnswers: string[],
    requiredCount: number
  ): string[] | null {
    const normalized = correctAnswer.toLowerCase().trim()

    // Filter out any wrong answer that matches correct answer
    const filtered = wrongAnswers.filter(
      ans => ans.toLowerCase().trim() !== normalized
    )

    // Deduplicate wrong answers (case-insensitive)
    const unique = deduplicateStrings(filtered)

    // Return null if insufficient unique answers
    return unique.length >= requiredCount ? unique.slice(0, requiredCount) : null
  }

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = shuffleArray(array)
    return shuffled.slice(0, Math.min(count, array.length))
  }
}
