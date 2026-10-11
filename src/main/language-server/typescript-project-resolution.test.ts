import { describe, expect, it } from 'vitest'
import { resolveTypeScriptProject } from './typescript-project-resolution'

function existsIn(paths: string[]) {
  const set = new Set(paths)
  return (path: string) => set.has(path)
}

describe('resolveTypeScriptProject', () => {
  it('uses the nearest tsconfig and searches node_modules from there up to the worktree', () => {
    const exists = existsIn(['/repo/tsconfig.json', '/repo/apps/frontend/tsconfig.json'])
    expect(
      resolveTypeScriptProject({
        filePath: '/repo/apps/frontend/src/entities/editor/a.tsx',
        worktreeRoot: '/repo',
        exists
      })
    ).toEqual({
      projectRoot: '/repo/apps/frontend',
      binDirs: [
        '/repo/apps/frontend/node_modules/.bin',
        '/repo/apps/node_modules/.bin',
        '/repo/node_modules/.bin'
      ]
    })
  })

  it('treats a jsconfig as a project too, and the worktree as one when there is neither', () => {
    expect(
      resolveTypeScriptProject({
        filePath: '/repo/packages/lib/src/a.ts',
        worktreeRoot: '/repo',
        exists: existsIn(['/repo/packages/lib/jsconfig.json'])
      }).projectRoot
    ).toBe('/repo/packages/lib')

    expect(
      resolveTypeScriptProject({
        filePath: '/repo/a.ts',
        worktreeRoot: '/repo',
        exists: existsIn([])
      })
    ).toEqual({ projectRoot: '/repo', binDirs: ['/repo/node_modules/.bin'] })
  })

  it("searches the main checkout's node_modules after the worktree's", () => {
    expect(
      resolveTypeScriptProject({
        filePath: '/wt/e-5139/apps/frontend/src/a.ts',
        worktreeRoot: '/wt/e-5139',
        repoRoot: '/repo',
        exists: existsIn(['/wt/e-5139/apps/frontend/tsconfig.json'])
      })
    ).toEqual({
      projectRoot: '/wt/e-5139/apps/frontend',
      binDirs: [
        '/wt/e-5139/apps/frontend/node_modules/.bin',
        '/wt/e-5139/apps/node_modules/.bin',
        '/wt/e-5139/node_modules/.bin',
        '/repo/apps/frontend/node_modules/.bin',
        '/repo/apps/node_modules/.bin',
        '/repo/node_modules/.bin'
      ]
    })
  })
})
