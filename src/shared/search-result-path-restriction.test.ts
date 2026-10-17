import { describe, expect, it } from 'vitest'
import type { SearchResult } from './code-search-types'
import { restrictSearchResultToPaths } from './search-result-path-restriction'

function file(relativePath: string, matchCount: number) {
  return { filePath: `/repo/${relativePath}`, relativePath, matches: [], matchCount }
}

const result: SearchResult = {
  files: [file('src/a.ts', 2), file('src/b.ts', 3)],
  totalMatches: 5,
  truncated: true
}

describe('restrictSearchResultToPaths', () => {
  it('drops files outside the set and recomputes the total', () => {
    const confined = restrictSearchResultToPaths(result, new Set(['src/a.ts']))
    expect(confined.droppedFiles).toBe(1)
    expect(confined.result.files.map((f) => f.relativePath)).toEqual(['src/a.ts'])
    expect(confined.result.totalMatches).toBe(2)
    // A host that ignored the restriction may have truncated before reaching allowed files.
    expect(confined.result.truncated).toBe(true)
  })

  it('returns the original result untouched when every file is allowed', () => {
    const confined = restrictSearchResultToPaths(result, new Set(['src/a.ts', 'src/b.ts']))
    expect(confined.droppedFiles).toBe(0)
    expect(confined.result).toBe(result)
  })

  it('matches case-insensitively when git and the filesystem disagree', () => {
    const confined = restrictSearchResultToPaths(result, new Set(['SRC/A.ts']))
    expect(confined.result.files.map((f) => f.relativePath)).toEqual(['src/a.ts'])
  })
})
