import type { SearchResult } from './code-search-types'

export function createEmptySearchResult(): SearchResult {
  return { files: [], totalMatches: 0, truncated: false }
}
