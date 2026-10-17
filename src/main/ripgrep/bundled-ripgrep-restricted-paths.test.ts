import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { runBundledRipgrepTextSearch } from './bundled-ripgrep-text-search'
import { buildRgArgs } from '../../shared/text-search'
import { MAX_RESTRICTED_SEARCH_PATHS } from '../../shared/text-search-path-restriction'

let rootPath: string

beforeEach(async () => {
  rootPath = await mkdtemp(join(tmpdir(), 'orca-rg-restricted-'))
  await writeFile(join(rootPath, 'changed.txt'), 'needle here\n')
  await writeFile(join(rootPath, 'untouched.txt'), 'needle here too\n')
  // Why `.ignore` not `.gitignore`: rg only reads gitignores inside a real repository.
  await writeFile(join(rootPath, '.ignore'), 'ignored.txt\n')
  await writeFile(join(rootPath, 'ignored.txt'), 'needle in an ignored file\n')
})

afterEach(async () => {
  await rm(rootPath, { recursive: true, force: true })
})

function search(restrictToPaths: string[] | undefined) {
  return runBundledRipgrepTextSearch({
    rootPath,
    resultRootPath: rootPath,
    options: { rootPath, query: 'needle', ...(restrictToPaths ? { restrictToPaths } : {}) },
    onSpawn: () => () => undefined
  })
}

it('puts the restricted paths after the argv separator', () => {
  const args = buildRgArgs('needle', ['src/a.ts', '-dash.ts'], {})
  expect(args.slice(args.indexOf('--'))).toEqual(['--', 'needle', 'src/a.ts', '-dash.ts'])
})

it('searches only the listed files, including ones git ignores', async () => {
  const result = await search(['changed.txt', 'ignored.txt'])
  expect(result.files.map((file) => file.relativePath).sort()).toEqual([
    'changed.txt',
    'ignored.txt'
  ])
  expect(result.truncated).toBe(false)
})

it('skips a path that vanished between git status and the spawn', async () => {
  const result = await search(['changed.txt', 'deleted-since.txt'])
  expect(result.files.map((file) => file.relativePath)).toEqual(['changed.txt'])
})

it('returns an empty result without spawning when the restriction clamps to nothing', async () => {
  const result = await search([])
  expect(result).toEqual({ files: [], totalMatches: 0, truncated: false })
})

it('never degrades an over-cap restriction into a whole-tree scan', async () => {
  const overCap = Array.from({ length: MAX_RESTRICTED_SEARCH_PATHS + 50 }, (_, i) =>
    i === 0 ? 'changed.txt' : `missing-${i}.txt`
  )
  const result = await search(overCap)
  expect(result.files.map((file) => file.relativePath)).toEqual(['changed.txt'])
  expect(result.truncated).toBe(true)
})

it('leaves an unrestricted search honouring ignore files', async () => {
  const result = await search(undefined)
  expect(result.files.map((file) => file.relativePath).sort()).toEqual([
    'changed.txt',
    'untouched.txt'
  ])
})

it('still fails loudly on an error that is not a per-path miss', async () => {
  await expect(
    runBundledRipgrepTextSearch({
      rootPath,
      resultRootPath: rootPath,
      options: { rootPath, query: '(', useRegex: true, restrictToPaths: ['changed.txt'] },
      onSpawn: () => () => undefined
    })
  ).rejects.toThrow()
})

afterEach(() => {
  vi.restoreAllMocks()
})
