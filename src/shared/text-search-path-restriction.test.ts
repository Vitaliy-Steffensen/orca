import { describe, expect, it } from 'vitest'
import {
  clampRestrictedSearchPaths,
  isUsableRestrictedSearchPath,
  MAX_RESTRICTED_SEARCH_PATHS,
  MAX_RESTRICTED_SEARCH_PATH_ARGV_BYTES
} from './text-search-path-restriction'

describe('isUsableRestrictedSearchPath', () => {
  it('accepts relative posix and windows paths', () => {
    expect(isUsableRestrictedSearchPath('src/a.ts')).toBe(true)
    expect(isUsableRestrictedSearchPath('src\\a.ts')).toBe(true)
    expect(isUsableRestrictedSearchPath('-dash-leading.ts')).toBe(true)
  })

  it('rejects anything that could escape the search root', () => {
    expect(isUsableRestrictedSearchPath('')).toBe(false)
    expect(isUsableRestrictedSearchPath('/abs/a.ts')).toBe(false)
    expect(isUsableRestrictedSearchPath('\\\\server\\share')).toBe(false)
    expect(isUsableRestrictedSearchPath('C:/abs/a.ts')).toBe(false)
    expect(isUsableRestrictedSearchPath('../outside.ts')).toBe(false)
    expect(isUsableRestrictedSearchPath('src/../../outside.ts')).toBe(false)
    expect(isUsableRestrictedSearchPath('src/a\0.ts')).toBe(false)
  })
})

describe('clampRestrictedSearchPaths', () => {
  it('keeps order and reports nothing truncated for a small set', () => {
    expect(clampRestrictedSearchPaths(['b.ts', 'a.ts'])).toEqual({
      paths: ['b.ts', 'a.ts'],
      truncated: false
    })
  })

  it('drops duplicates without claiming truncation', () => {
    expect(clampRestrictedSearchPaths(['a.ts', 'a.ts'])).toEqual({
      paths: ['a.ts'],
      truncated: false
    })
  })

  it('drops unusable entries and reports truncation', () => {
    expect(clampRestrictedSearchPaths(['a.ts', '../b.ts'])).toEqual({
      paths: ['a.ts'],
      truncated: true
    })
  })

  it('caps the entry count', () => {
    const paths = Array.from({ length: MAX_RESTRICTED_SEARCH_PATHS + 5 }, (_, i) => `f${i}.ts`)
    const clamped = clampRestrictedSearchPaths(paths)
    expect(clamped.paths).toHaveLength(MAX_RESTRICTED_SEARCH_PATHS)
    expect(clamped.paths[0]).toBe('f0.ts')
    expect(clamped.truncated).toBe(true)
  })

  it('caps the argv byte budget before the entry count', () => {
    const long = `${'d'.repeat(500)}/file.ts`
    const clamped = clampRestrictedSearchPaths(Array.from({ length: 200 }, (_, i) => `${i}${long}`))
    expect(clamped.truncated).toBe(true)
    const bytes = clamped.paths.reduce((sum, p) => sum + Buffer.byteLength(p, 'utf8') + 1, 0)
    expect(bytes).toBeLessThanOrEqual(MAX_RESTRICTED_SEARCH_PATH_ARGV_BYTES)
    // Why: the whole command line, wsl wrapper included, must stay under Windows' 32767 cap.
    expect(bytes).toBeLessThan(32000)
  })
})
