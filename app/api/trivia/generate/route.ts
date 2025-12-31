import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '../db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface Song {
  id: string
  name: string
  artist: string
  album?: string
  releaseYear?: string
}

interface TriviaQuestion {
  question: string
  correctAnswer: string
  wrongAnswers: string[]
  category: string
}

interface TriviaResult {
  songId: string
  songTitle: string
  artistName: string
  questions: TriviaQuestion[]
}

export async function POST(request: NextRequest) {
  try {
    const { songs, categories } = await request.json()

    if (!Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json({ error: 'songs array required' }, { status: 400 })
    }

    // Safety limit: prevent accidental massive costs
    if (songs.length > 200) {
      console.warn(`⚠️  Playlist has ${songs.length} songs. Maximum 200 songs allowed for trivia generation.`)
      return NextResponse.json(
        {
          error: `Playlist too large. Maximum 200 songs allowed for trivia generation (you have ${songs.length} songs).`,
          suggestion: 'Consider creating a smaller playlist or disabling some trivia categories.'
        },
        { status: 400 }
      )
    }

    // Check for existing trivia and determine what's missing
    const { db } = await connectToDatabase()
    const collection = db.collection('trivia_questions')

    const songIds = songs.map((s: Song) => s.id)
    const existing = await collection
      .find({ songSpotifyId: { $in: songIds } })
      .toArray()

    // Build map of song ID -> existing categories
    const existingCategoriesMap = new Map<string, Set<string>>()
    existing.forEach(doc => {
      const categories = new Set(doc.questions.map((q: any) => q.category))
      existingCategoriesMap.set(doc.songSpotifyId, categories)
    })

    const requestedCategories = categories || [
      'band_info',
      'historical',
      'media',
      'production',
      'awards',
      'songwriting',
      'chart_performance',
      'covers',
      'music_video',
      'live_performance',
      'collaborations',
      'cultural_impact',
      'album_context',
      'controversies',
    ]

    // Determine which songs need new trivia (either no trivia at all, or missing requested categories)
    const songsNeedingTrivia = songs.filter((s: Song) => {
      const existingCats = existingCategoriesMap.get(s.id)
      if (!existingCats) return true // No trivia at all

      // Check if song has all requested categories
      const missingCategories = requestedCategories.filter(cat => !existingCats.has(cat))
      return missingCategories.length > 0 // Has some but not all
    })

    const fullyCachedCount = songs.length - songsNeedingTrivia.length

    console.log(`📊 Trivia status:`)
    console.log(`   - ${fullyCachedCount} songs fully cached (have all requested categories)`)
    console.log(`   - ${songsNeedingTrivia.length} songs need new/additional trivia`)

    if (songsNeedingTrivia.length === 0) {
      console.log('✅ All songs already have all requested categories (100% cache hit)')
      return NextResponse.json({
        message: 'All songs already have trivia for all requested categories',
        generated: 0,
        reused: songs.length,
      })
    }

    // Estimate cost (Haiku: ~$2.40 per million tokens average for input+output mix)
    const estimatedTokens = songsNeedingTrivia.length * 700 // ~700 tokens per song (input + output)
    const estimatedCost = (estimatedTokens / 1000000) * 2.40
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(3)} for ${songsNeedingTrivia.length} songs (~${estimatedTokens.toLocaleString()} tokens)`)

    // Generate trivia for missing categories
    const generatedTrivia = await generateTriviaWithClaude(
      songsNeedingTrivia,
      requestedCategories
    )

    // Store in MongoDB
    console.log(`\n💾 Storing ${generatedTrivia.length} songs in MongoDB...`)

    if (generatedTrivia.length > 0) {
      // Validate IDs before inserting
      const invalidIds: string[] = []
      const validDocuments = generatedTrivia.filter(trivia => {
        const isValid = trivia.songId &&
                       !trivia.songId.includes('not_available') &&
                       !trivia.songId.includes('spotify:') &&
                       trivia.songId.length > 10

        if (!isValid) {
          invalidIds.push(`"${trivia.songTitle}" has invalid ID: ${trivia.songId}`)
          return false
        }
        return true
      })

      if (invalidIds.length > 0) {
        console.log(`\n⚠️  WARNING: ${invalidIds.length} songs have invalid Spotify IDs:`)
        invalidIds.forEach(msg => console.log(`   ${msg}`))
        console.log(`   These songs will NOT be inserted to avoid database corruption.\n`)
      }

      if (validDocuments.length === 0) {
        console.log(`❌ No valid documents to insert - all IDs are invalid!`)
      } else {
        console.log(`✅ Validated ${validDocuments.length}/${generatedTrivia.length} songs have correct Spotify IDs`)

        // Log first few IDs for verification
        console.log(`   Sample IDs:`)
        validDocuments.slice(0, 3).forEach(doc => {
          console.log(`   - "${doc.songTitle}" → ${doc.songId}`)
        })

        try {
          let inserted = 0
          let updated = 0

          for (const trivia of validDocuments) {
            const existingDoc = await collection.findOne({ songSpotifyId: trivia.songId })

            if (!existingDoc) {
              // No existing doc - insert new
              await collection.insertOne({
                songSpotifyId: trivia.songId,
                songTitle: trivia.songTitle,
                artistName: trivia.artistName,
                questions: trivia.questions,
                generatedAt: new Date(),
                llmModel: 'claude-3-5-haiku-20241022',
                version: 1,
              })
              inserted++
            } else {
              // Existing doc - merge new questions (avoid duplicates by category)
              const existingCategories = new Set(existingDoc.questions.map((q: any) => q.category))
              const newQuestions = trivia.questions.filter(
                (q: TriviaQuestion) => !existingCategories.has(q.category)
              )

              if (newQuestions.length > 0) {
                await collection.updateOne(
                  { songSpotifyId: trivia.songId },
                  {
                    $push: { questions: { $each: newQuestions } },
                    $set: { updatedAt: new Date() }
                  }
                )
                updated++
                console.log(`   ↗️  Added ${newQuestions.length} new categories to "${trivia.songTitle}"`)
              }
            }
          }

          console.log(`✅ Successfully processed ${validDocuments.length} songs:`)
          console.log(`   - ${inserted} new documents inserted`)
          console.log(`   - ${updated} existing documents updated with new categories`)
        } catch (error: any) {
          console.error(`❌ MongoDB operation error:`, error.message)
          throw error
        }
      }
    }

    // Verify what's actually in the database now
    const finalCheck = await collection.find({ songSpotifyId: { $in: songIds } }).toArray()
    const finalIds = finalCheck.map(doc => doc.songSpotifyId)

    console.log(`\n${'='.repeat(60)}`)
    console.log(`🎉 TRIVIA GENERATION COMPLETE`)
    console.log(`${'='.repeat(60)}`)
    console.log(`   Total songs requested: ${songs.length}`)
    console.log(`   Songs fully cached (all categories): ${fullyCachedCount}`)
    console.log(`   Songs needing trivia: ${songsNeedingTrivia.length}`)
    console.log(`   Songs generated: ${generatedTrivia.length}`)
    console.log(`   Success rate: ${((generatedTrivia.length / songsNeedingTrivia.length) * 100).toFixed(1)}%`)
    console.log(`   📊 Database check: ${finalIds.length} songs now have trivia in MongoDB`)
    console.log(`${'='.repeat(60)}`)
    if (finalIds.length > 0) {
      console.log(`   Songs with trivia in DB (showing category count):`)
      finalCheck.slice(0, 10).forEach(doc => {
        const cats = new Set(doc.questions?.map((q: any) => q.category) || [])
        console.log(`   ✓ ${doc.songTitle} - ${doc.artistName} (${cats.size} categories, ${doc.questions?.length || 0} questions)`)
      })
      if (finalIds.length > 10) {
        console.log(`   ... and ${finalIds.length - 10} more`)
      }
    }
    console.log(`${'='.repeat(60)}\n`)

    return NextResponse.json({
      message: 'Trivia generated successfully',
      generated: songsNeedingTrivia.length,
      reused: songs.length - songsNeedingTrivia.length,
    })
  } catch (error: any) {
    console.error('Error generating trivia:', error)
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    )
  }
}

async function generateTriviaWithClaude(
  songs: Song[],
  categories: string[]
): Promise<TriviaResult[]> {
  // Dynamic batch size based on token limits
  const MAX_OUTPUT_TOKENS = 8192 // Haiku's max output limit
  const ESTIMATED_TOKENS_PER_SONG = 350 // ~5 questions × 70 tokens each
  const SAFETY_MARGIN = 0.85 // 85% utilization to avoid truncation

  const BATCH_SIZE = Math.max(
    5, // Minimum batch size
    Math.floor((MAX_OUTPUT_TOKENS * SAFETY_MARGIN) / ESTIMATED_TOKENS_PER_SONG)
  )

  const results: TriviaResult[] = []

  console.log(`📝 Generating trivia for ${songs.length} songs in batches of ${BATCH_SIZE} (adaptive sizing: ${MAX_OUTPUT_TOKENS} tokens ÷ ${ESTIMATED_TOKENS_PER_SONG} per song)`)

  // Process in batches
  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(songs.length / BATCH_SIZE)

    console.log(`\n${'='.repeat(60)}`)
    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} songs)`)
    console.log(`${'='.repeat(60)}`)
    batch.forEach((song, idx) => {
      console.log(`  ${idx + 1}. "${song.name}" by ${song.artist}`)
    })
    console.log('')

    try {
      const batchResults = await generateBatchWithRetry(batch, categories)
      results.push(...batchResults)
      console.log(`\n✅ Batch ${batchNum}/${totalBatches} completed: ${batchResults.length}/${batch.length} songs generated`)
      if (batchResults.length > 0) {
        console.log(`   Songs with trivia:`)
        batchResults.forEach(r => {
          console.log(`   ✓ ${r.songTitle} - ${r.artistName} (${r.questions.length} questions)`)
        })
      }
      if (batchResults.length < batch.length) {
        console.log(`   ⚠️  Skipped ${batch.length - batchResults.length} songs (insufficient information)`)
      }
    } catch (error) {
      console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, error)
      // Continue with next batch instead of failing entire job
    }

    // Rate limiting: wait 1 second between batches (only if more batches remain)
    if (i + BATCH_SIZE < songs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

async function generateBatchWithRetry(
  batch: Song[],
  categories: string[],
  maxRetries = 3
): Promise<TriviaResult[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateAllSongs(batch, categories)
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limit - wait and retry
        const delay = Math.pow(2, attempt) * 1000
        console.log(`⏳ Rate limited, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else if (error.status >= 500) {
        // Server error - retry
        console.log(`🔄 Server error, attempt ${attempt}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        // Client error - don't retry
        throw error
      }
    }
  }
  throw new Error('Max retries exceeded')
}

async function generateAllSongs(songs: Song[], categories: string[]): Promise<TriviaResult[]> {
  const prompt = buildPrompt(songs, categories)

  console.log(`🤖 Calling Claude API (Haiku)...`)
  console.log(`   Model: claude-3-5-haiku-20241022`)
  console.log(`   Max tokens: 8192`)
  console.log(`   Temperature: 0.7`)
  console.log(`   Prompt length: ${prompt.length} characters`)

  const apiStartTime = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 8192,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })
  const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(1)

  // Log actual token usage (Haiku pricing: $0.80 input, $4 output per million)
  const usage = response.usage
  const totalTokens = usage.input_tokens + usage.output_tokens
  const cost = (usage.input_tokens * 0.80 / 1000000) + (usage.output_tokens * 4 / 1000000)
  console.log(`⏱️  API response received in ${apiDuration}s`)
  console.log(`📊 Token usage: ${usage.input_tokens.toLocaleString()} input + ${usage.output_tokens.toLocaleString()} output = ${totalTokens.toLocaleString()} total (~$${cost.toFixed(3)})`)

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  console.log(`📝 Parsing response...`)
  console.log(`   Response length: ${content.text.length} characters`)

  // Strip markdown code blocks if present (```json ... ```)
  let jsonText = content.text.trim()
  const hadMarkdown = jsonText.startsWith('```')
  if (hadMarkdown) {
    // Remove opening ```json or ``` (with optional whitespace)
    jsonText = jsonText.replace(/^```\s*(?:json)?\s*\r?\n?/, '')
    // Remove closing ```
    jsonText = jsonText.replace(/\r?\n?```\s*$/, '')
    jsonText = jsonText.trim()
    console.log(`   Stripped markdown code blocks`)
  }

  // Log a preview to help debug parsing issues
  console.log(`   First 200 chars: ${jsonText.substring(0, 200)}`)

  let parsed
  try {
    parsed = JSON.parse(jsonText)
    console.log(`✅ JSON parsed successfully: ${parsed.length} songs in response`)
  } catch (parseError) {
    console.error('❌ Failed to parse Claude response as JSON')
    console.error('First 500 chars:', jsonText.substring(0, 500))
    console.error('Last 200 chars:', jsonText.substring(jsonText.length - 200))
    throw parseError
  }

  console.log(`🔍 Validating trivia structure...`)
  // Validate and normalize structure
  const validated = parsed.map(validateAndNormalize)
  console.log(`✅ Validation complete: ${validated.length} songs validated`)

  return validated
}

function buildPrompt(songs: Song[], categories: string[]): string {
  const categoryDescriptions = {
    band_info: 'Formation, members, origins, fun facts',
    historical: 'Events/politics when song released',
    media: 'Movies, TV, commercials, video games',
    production: 'Producer, studio, recording techniques',
    awards: 'Grammy wins, certifications, chart performance',
    songwriting: 'Inspiration, story behind lyrics, co-writers',
    chart_performance: 'Peak positions, weeks on charts',
    covers: 'Famous covers, samples, remixes',
    music_video: 'Director, concept, filming location',
    live_performance: 'Famous performances, tours, venues',
    collaborations: 'Featured artists, guest musicians',
    cultural_impact: 'Cultural influence, memes, movements',
    album_context: 'Album name, track number, album concept',
    controversies: 'Bans, censorship, lawsuits, interesting facts',
  }

  const categoryList = categories
    .map((cat, i) => `${i + 1}. ${cat}: ${categoryDescriptions[cat as keyof typeof categoryDescriptions] || cat}`)
    .join('\n  ')

  const songList = songs
    .map(
      (s, i) =>
        `${i + 1}. ID: ${s.id} | "${s.name}" by ${s.artist}${s.album ? ` (${s.album}` : ''}${s.releaseYear ? `, ${s.releaseYear}` : ''}${s.album ? ')' : ''}`
    )
    .join('\n')

  return `You are a music trivia expert. Generate ONE engaging trivia question for EACH song below.

GOAL: Generate trivia for AS MANY SONGS AS POSSIBLE - coverage is more important than depth!

Choose the BEST category from these ${categories.length} options for each song:
  ${categoryList}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 1 question per song - pick the most interesting/answerable question
2. NEVER skip a song - if you know ANYTHING about it, create a question!
3. For film/movie soundtracks: ask which film it's from, or composer, or year released, or awards won
4. For popular songs: use chart performance, awards, album name, or production details
5. Wrong answers MUST be plausible and from the same domain (e.g., if answer is a year, wrong answers are nearby years)
6. Avoid generic wrong answers like "Unknown" or "N/A"
7. Questions should be answerable in 1-2 words or a short phrase
8. Use your general music knowledge - educated guesses and reasonable inferences are HIGHLY encouraged
9. Generate exactly 3 wrong answers per question
10. PRIORITY: Include trivia for ALL songs in the list - even obscure ones likely have ONE interesting fact!

Songs:
${songList}

Return a JSON array with this EXACT structure (use the ID provided for each song):
[
  {
    "songId": "USE_THE_ID_FROM_ABOVE",
    "songTitle": "Song Name",
    "artistName": "Artist Name",
    "questions": [
      {
        "question": "What year was the band formed?",
        "correctAnswer": "1985",
        "wrongAnswers": ["1983", "1987", "1989"],
        "category": "band_info"
      }
    ]
  }
]

IMPORTANT:
- Return ONLY the JSON array, no additional text before or after
- Ensure all strings are properly escaped (no unescaped quotes, newlines, or control characters)
- Keep all text on single lines - do not use newlines within string values`
}

function validateAndNormalize(triviaData: any): TriviaResult {
  // Ensure all required fields exist
  if (!triviaData.songId || !triviaData.songTitle || !triviaData.artistName) {
    throw new Error('Missing required fields in trivia data')
  }

  if (!Array.isArray(triviaData.questions)) {
    throw new Error('Questions must be an array')
  }

  // Validate each question
  const validatedQuestions = triviaData.questions.map((q: any) => {
    if (!q.question || !q.correctAnswer || !Array.isArray(q.wrongAnswers) || !q.category) {
      throw new Error('Invalid question structure')
    }

    // Ensure exactly 3 wrong answers
    const wrongAnswers = q.wrongAnswers.slice(0, 3)
    if (wrongAnswers.length < 3) {
      console.warn(
        `Question "${q.question}" has only ${wrongAnswers.length} wrong answers, expected 3`
      )
    }

    return {
      question: q.question,
      correctAnswer: q.correctAnswer,
      wrongAnswers,
      category: q.category,
    }
  })

  return {
    songId: triviaData.songId,
    songTitle: triviaData.songTitle,
    artistName: triviaData.artistName,
    questions: validatedQuestions,
  }
}
