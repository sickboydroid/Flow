/**
 * N-gram helpers used to power typo-tolerant search.
 *
 * On write, every searchable document stores the `nGrams` of its key
 * fields in `search_ngrams: string[]`. On read, we run `queryNGrams`
 * over the user's input and look for documents that share any gram via
 * `{ search_ngrams: { $in: terms } }`. This catches partial matches
 * and small typos without needing a full text index.
 */

const DEFAULT_MIN = 3;
const DEFAULT_MAX = 4;

/**
 * Generates a deduplicated list of grams of length `[minN, maxN]` for
 * the given text. Whitespace is stripped and the input is lowercased
 * so search becomes case- and spacing-insensitive.
 */
export function nGrams(text: string, minN: number = DEFAULT_MIN, maxN: number = DEFAULT_MAX): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  if (normalized.length < minN) return [normalized];

  const grams: Set<string> = new Set();
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= normalized.length - n; i++) {
      grams.add(normalized.substring(i, i + n));
    }
  }
  return Array.from(grams);
}

/** Same as `nGrams(text, 3, 4)`. Use for incoming search queries. */
export function queryNGrams(text: string): string[] {
  return nGrams(text, DEFAULT_MIN, DEFAULT_MAX);
}
