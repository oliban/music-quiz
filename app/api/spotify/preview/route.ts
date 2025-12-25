import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'
import { PreviewUrlExtractor } from '@/src/lib/spotify/previewExtractor'

// Singleton instance for caching across requests
const extractor = new PreviewUrlExtractor()

export async function GET(request: NextRequest) {
  // Require authentication
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get track IDs from query parameter
  const searchParams = request.nextUrl.searchParams
  const trackIdsParam = searchParams.get('trackIds')

  if (!trackIdsParam) {
    return NextResponse.json(
      { error: 'trackIds parameter required' },
      { status: 400 }
    )
  }

  // Parse and validate track IDs
  const trackIds = trackIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0)

  if (trackIds.length === 0) {
    return NextResponse.json(
      { error: 'At least one track ID required' },
      { status: 400 }
    )
  }

  if (trackIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 track IDs allowed per request' },
      { status: 400 }
    )
  }

  try {
    console.log(`📥 Preview URL extraction request for ${trackIds.length} tracks`)

    // Extract preview URLs for all tracks in parallel
    const extractionPromises = trackIds.map(async (trackId) => {
      const previewUrl = await extractor.extractPreviewUrl(trackId)
      return {
        trackId,
        preview_url: previewUrl,
        cached: false // TODO: Track cache hits if needed
      }
    })

    const results = await Promise.all(extractionPromises)

    // Format response as object keyed by track ID
    const previews: Record<string, { preview_url: string | null; cached: boolean }> = {}
    for (const result of results) {
      previews[result.trackId] = {
        preview_url: result.preview_url,
        cached: result.cached
      }
    }

    const successCount = results.filter(r => r.preview_url !== null).length
    console.log(`✅ Extracted ${successCount}/${trackIds.length} preview URLs`)

    return NextResponse.json({ previews })
  } catch (error) {
    console.error('Preview URL extraction error:', error)
    return NextResponse.json(
      { error: 'Extraction failed' },
      { status: 500 }
    )
  }
}
