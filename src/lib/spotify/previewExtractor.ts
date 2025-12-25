/**
 * PreviewUrlExtractor - Extracts Spotify preview URLs from embed player HTML
 *
 * This is a workaround for Spotify's deprecation of the preview_url field in their API
 * (deprecated November 27, 2024). The embed player still contains preview URLs in its HTML.
 *
 * WARNING: This is an unofficial workaround and may violate Spotify's Terms of Service.
 * Use at your own risk. May break if Spotify changes their embed player structure.
 */

interface PreviewUrlCache {
  url: string
  timestamp: number
}

export class PreviewUrlExtractor {
  private cache: Map<string, PreviewUrlCache> = new Map()
  private readonly maxCacheSize = 500
  private readonly cacheDuration = 3600000 // 1 hour in milliseconds

  /**
   * Extract preview URL for a Spotify track
   * @param trackId - Spotify track ID
   * @returns Preview URL or null if extraction fails
   */
  async extractPreviewUrl(trackId: string): Promise<string | null> {
    // Validate track ID format (Spotify IDs are 22 alphanumeric characters)
    if (!trackId || typeof trackId !== 'string' || trackId.length !== 22 || !/^[a-zA-Z0-9]+$/.test(trackId)) {
      console.warn(`Invalid track ID format: ${trackId}`)
      return null
    }

    // Check cache first
    const cached = this.cache.get(trackId)
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ Cache hit for track ${trackId}`)
      return cached.url
    }

    try {
      // Fetch embed HTML
      const embedUrl = `https://open.spotify.com/embed/track/${trackId}`
      console.log(`🔍 Fetching embed HTML: ${embedUrl}`)

      const response = await fetch(embedUrl)

      if (!response.ok) {
        console.error(`Failed to fetch embed HTML: ${response.status} ${response.statusText}`)
        return null
      }

      const html = await response.text()

      // Parse HTML to extract preview URL
      const previewUrl = this.parseEmbedHtml(html)

      if (previewUrl) {
        // Cache the result
        this.cache.set(trackId, {
          url: previewUrl,
          timestamp: Date.now()
        })

        // Prune cache if necessary
        this.pruneCache()

        console.log(`✅ Extracted preview URL for track ${trackId}`)
        return previewUrl
      }

      console.warn(`⚠️ No preview URL found in embed HTML for track ${trackId}`)
      return null
    } catch (error) {
      console.error(`Error extracting preview URL for track ${trackId}:`, error)
      return null
    }
  }

  /**
   * Parse embed HTML to extract preview URL
   * Uses multiple regex patterns as fallback strategies
   */
  private parseEmbedHtml(html: string): string | null {
    // Strategy 1: Look for audio element src attribute
    const audioSrcPattern = /<audio[^>]+src="(https:\/\/p\.scdn\.co\/mp3-preview\/[^"]+)"/
    let match = html.match(audioSrcPattern)
    if (match && match[1]) {
      console.log('✅ Found preview URL via audio src pattern')
      return match[1]
    }

    // Strategy 2: Look for audioPreview property in JavaScript
    const audioPreviewPattern = /"audioPreview":"(https:\/\/p\.scdn\.co\/mp3-preview\/[^"]+)"/
    match = html.match(audioPreviewPattern)
    if (match && match[1]) {
      console.log('✅ Found preview URL via audioPreview pattern')
      return match[1]
    }

    // Strategy 3: Look for preview_url property in JavaScript
    const previewUrlPattern = /"preview_url":"(https:\/\/p\.scdn\.co\/mp3-preview\/[^"]+)"/
    match = html.match(previewUrlPattern)
    if (match && match[1]) {
      console.log('✅ Found preview URL via preview_url pattern')
      return match[1]
    }

    // Strategy 4: Look for any mp3-preview URL (broader pattern)
    const broadPattern = /(https:\/\/p\.scdn\.co\/mp3-preview\/[a-f0-9]+)/
    match = html.match(broadPattern)
    if (match && match[1]) {
      console.log('✅ Found preview URL via broad pattern')
      return match[1]
    }

    console.warn('❌ No preview URL patterns matched')
    return null
  }

  /**
   * Check if cached entry is still valid (not expired)
   */
  private isCacheValid(cached: PreviewUrlCache): boolean {
    const age = Date.now() - cached.timestamp
    return age < this.cacheDuration
  }

  /**
   * Prune cache using LRU strategy when size exceeds limit
   */
  private pruneCache(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return
    }

    // Remove oldest entries until we're under the limit
    const entriesToRemove = this.cache.size - this.maxCacheSize
    let removed = 0

    // Sort entries by timestamp (oldest first)
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    for (const [trackId] of sortedEntries) {
      if (removed >= entriesToRemove) {
        break
      }
      this.cache.delete(trackId)
      removed++
    }

    console.log(`🧹 Pruned ${removed} entries from cache (size: ${this.cache.size})`)
  }

  /**
   * Get current cache size (for debugging/monitoring)
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Clear all cached entries (for testing/debugging)
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🧹 Cache cleared')
  }
}
