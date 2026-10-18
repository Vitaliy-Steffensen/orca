import { describe, expect, it } from 'vitest'
import { classifyDiffArea, summarizeDiffAreas } from './diff-area'

describe('classifyDiffArea', () => {
  it('keeps CI, e2e, frontend, and backend apart', () => {
    expect(classifyDiffArea('.github/workflows/ci.yml')).toBe('ci')
    expect(classifyDiffArea('Dockerfile')).toBe('ci')
    expect(classifyDiffArea('e2e/checkout.spec.ts')).toBe('e2e')
    expect(classifyDiffArea('src/renderer/sidebar/Card.tsx')).toBe('fe')
    expect(classifyDiffArea('src/components/Button.tsx')).toBe('fe')
    expect(classifyDiffArea('src/main/github/client.ts')).toBe('be')
  })

  it('lets CI and e2e win over a frontend extension', () => {
    expect(classifyDiffArea('.github/workflows/preview.tsx')).toBe('ci')
    expect(classifyDiffArea('playwright/home.spec.tsx')).toBe('e2e')
  })
})

describe('summarizeDiffAreas', () => {
  it('weights each area by added and deleted lines', () => {
    expect(
      summarizeDiffAreas([
        { path: 'src/App.tsx', additions: 10, deletions: 2 },
        { path: 'src/main/api.ts', additions: 4, deletions: 1 },
        { path: 'e2e/home.spec.ts', additions: 3 },
        { path: '.github/workflows/ci.yml', deletions: 2 }
      ])
    ).toEqual({ fe: 12, be: 5, e2e: 3, ci: 2 })
  })

  it('returns nothing when every file is empty or binary', () => {
    expect(summarizeDiffAreas([{ path: 'src/image.png', additions: 0, deletions: 0 }])).toBeNull()
    expect(summarizeDiffAreas([])).toBeNull()
  })
})
