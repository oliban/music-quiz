/**
 * Deduplicate an array of strings (case-insensitive).
 * Preserves the original casing of the first occurrence.
 */
export function deduplicateStrings(items: string[]): string[] {
  const seen = new Map<string, string>()
  for (const item of items) {
    const normalized = item.toLowerCase().trim()
    if (!seen.has(normalized)) {
      seen.set(normalized, item)
    }
  }
  return Array.from(seen.values())
}

/**
 * Deduplicate an array of objects by a key function.
 * The key comparison is case-insensitive.
 */
export function deduplicateByKey<T>(
  items: T[],
  keyFn: (item: T) => string
): T[] {
  const seen = new Map<string, T>()
  for (const item of items) {
    const key = keyFn(item).toLowerCase().trim()
    if (!seen.has(key)) {
      seen.set(key, item)
    }
  }
  return Array.from(seen.values())
}

/**
 * Fisher-Yates shuffle algorithm for randomizing arrays.
 * More uniform distribution than naive Math.random() sort.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
