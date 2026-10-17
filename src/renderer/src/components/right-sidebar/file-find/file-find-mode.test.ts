import { describe, expect, it } from 'vitest'
import { explorerViewToFindMode, findModeToExplorerView } from './file-find-mode'

describe('file find mode mapping', () => {
  it('round-trips both explorer views', () => {
    expect(explorerViewToFindMode('files')).toBe('names')
    expect(explorerViewToFindMode('search')).toBe('contents')
    expect(findModeToExplorerView('names')).toBe('files')
    expect(findModeToExplorerView('contents')).toBe('search')
  })

  it('treats anything other than the content view as the name filter', () => {
    // SAFETY: a persisted route from an older build can hold a value outside the union.
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: exercising an out-of-union persisted value.
    expect(explorerViewToFindMode('legacy' as 'files')).toBe('names')
  })
})
