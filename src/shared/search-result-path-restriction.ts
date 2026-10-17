import type { SearchResult } from './code-search-types'

/**
 * Confine a search result to an allowed path set. The guaranteed floor when the
 * host ignored `restrictToPaths` — an older peer drops the field and searches
 * everything, so correctness can never depend on it honouring the restriction.
 */
export function restrictSearchResultToPaths(
  result: SearchResult,
  allowedRelativePaths: ReadonlySet<string>
): { result: SearchResult; droppedFiles: number } {
  const lowercased = new Set<string>()
  for (const path of allowedRelativePaths) {
    lowercased.add(path.toLowerCase())
  }
  const files = result.files.filter(
    (file) =>
      allowedRelativePaths.has(file.relativePath) || lowercased.has(file.relativePath.toLowerCase())
  )
  if (files.length === result.files.length) {
    return { result, droppedFiles: 0 }
  }
  const totalMatches = files.reduce(
    (sum, file) => sum + (file.matchCount ?? file.matches.length),
    0
  )
  return {
    result: { files, totalMatches, truncated: result.truncated },
    droppedFiles: result.files.length - files.length
  }
}
