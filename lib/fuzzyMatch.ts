/**
 * Fuzzy matching utility for matching OCR-extracted vendor/supplier names
 * against existing database suppliers.
 */

// Noise words common in Indian business names & GST invoices
const NOISE_WORDS = new Set([
  'm/s', 'ms', 'pvt', 'ltd', 'limited', 'private', 'co', 'corp', 'corporation',
  'store', 'stores', 'agency', 'agencies', 'enterprise', 'enterprises',
  'traders', 'trader', 'industries', 'industry', 'company', 'shop', 'supplier',
  'suppliers', 'and', '&', 'the', 'sons', 'brothers',
])

/**
 * Normalizes a business name by removing punctuation, noise words, and extra spaces.
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return ''
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !NOISE_WORDS.has(w))

  return words.join(' ').trim()
}

/**
 * Standard Levenshtein Distance implementation
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculates string similarity ratio (0 to 1) based on Levenshtein distance
 */
function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  const dist = levenshteinDistance(s1, s2)
  return Math.max(0, 1 - dist / maxLen)
}

/**
 * Calculates Jaccard similarity across word tokens
 */
function tokenJaccardSimilarity(s1: string, s2: string): number {
  const words1 = s1.split(/\s+/).filter(Boolean)
  const words2 = s2.split(/\s+/).filter(Boolean)

  if (words1.length === 0 || words2.length === 0) return 0

  const set1 = new Set(words1)
  const set2 = new Set(words2)

  let intersection = 0
  set1.forEach(t => {
    if (set2.has(t)) intersection++
  })

  // Combine words into single set without spread operator
  const allWords = words1.concat(words2)
  const unionSet = new Set(allWords)

  return unionSet.size === 0 ? 0 : intersection / unionSet.size
}

/**
 * Computes composite similarity score between an OCR target name and a candidate name
 */
export function computeSimilarity(ocrName: string, candidateName: string): number {
  const rawOcr = ocrName.trim().toLowerCase()
  const rawCandidate = candidateName.trim().toLowerCase()

  // 1. Direct exact or substring match
  if (rawOcr === rawCandidate) return 1.0
  if (rawOcr.includes(rawCandidate) || rawCandidate.includes(rawOcr)) {
    const ratio = Math.min(rawOcr.length, rawCandidate.length) / Math.max(rawOcr.length, rawCandidate.length)
    return Math.max(0.85, ratio)
  }

  // 2. Normalized match (without noise words like 'pvt ltd', 'agencies', etc.)
  const normOcr = normalizeBusinessName(ocrName)
  const normCandidate = normalizeBusinessName(candidateName)

  if (!normOcr || !normCandidate) return 0
  if (normOcr === normCandidate) return 0.98

  if (normOcr.includes(normCandidate) || normCandidate.includes(normOcr)) {
    return 0.88
  }

  // 3. Token Jaccard overlap (e.g. "Sharma Steels Corporation" vs "Sharma Steels")
  const tokenScore = tokenJaccardSimilarity(normOcr, normCandidate)

  // 4. Levenshtein string distance on normalized names
  const levScore = stringSimilarity(normOcr, normCandidate)

  // Weighted composite score (heavier weight on token match for multi-word brand names)
  return tokenScore * 0.6 + levScore * 0.4
}

/**
 * Finds the best matching supplier from a list of candidates
 */
export function findBestSupplierMatch<T extends { id: string; name: string }>(
  ocrName: string,
  candidates: T[],
  threshold = 0.55
): {
  bestMatch: T | null
  score: number
  allRanked: { supplier: T; score: number }[]
} {
  if (!ocrName || !candidates.length) {
    return { bestMatch: null, score: 0, allRanked: [] }
  }

  const scored = candidates
    .map(c => ({
      supplier: c,
      score: Math.round(computeSimilarity(ocrName, c.name) * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score)

  const top = scored[0]

  return {
    bestMatch: top && top.score >= threshold ? top.supplier : null,
    score: top ? top.score : 0,
    allRanked: scored,
  }
}
