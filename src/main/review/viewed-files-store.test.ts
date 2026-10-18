import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_VIEWED_FILES_STATE } from '../../shared/diff-review-identity'
import { readViewedFiles, writeViewedFiles } from './viewed-files-store'

describe('viewed files store', () => {
  let dir = ''
  let file = ''

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'orca-viewed-files-'))
    file = join(dir, 'nested', 'review-viewed-files.json')
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('round-trips one workspace through a file it creates', async () => {
    expect(await readViewedFiles(file, 'w1')).toEqual(EMPTY_VIEWED_FILES_STATE)
    await writeViewedFiles(file, 'w1', {
      version: 1,
      files: { 'src/a.ts': { viewedAt: 7, viewedIdentity: 'd1' } }
    })
    expect(await readViewedFiles(file, 'w1')).toEqual({
      version: 1,
      files: { 'src/a.ts': { viewedAt: 7, viewedIdentity: 'd1' } }
    })
  })

  it('keeps other workspaces when one is rewritten', async () => {
    await writeViewedFiles(file, 'w1', {
      version: 1,
      files: { 'a.ts': { viewedAt: 1, viewedIdentity: 'd1' } }
    })
    await writeViewedFiles(file, 'w2', {
      version: 1,
      files: { 'b.ts': { viewedAt: 2, viewedIdentity: 'd2' } }
    })
    await writeViewedFiles(file, 'w1', {
      version: 1,
      files: { 'a.ts': { viewedAt: 3, viewedIdentity: 'd3' } }
    })
    expect((await readViewedFiles(file, 'w1')).files['a.ts']).toEqual({
      viewedAt: 3,
      viewedIdentity: 'd3'
    })
    expect((await readViewedFiles(file, 'w2')).files['b.ts']).toEqual({
      viewedAt: 2,
      viewedIdentity: 'd2'
    })
  })

  it('serializes concurrent writes instead of letting one overwrite the other', async () => {
    await Promise.all(
      ['w1', 'w2', 'w3'].map((id, index) =>
        writeViewedFiles(file, id, {
          version: 1,
          files: { 'a.ts': { viewedAt: index, viewedIdentity: `d${index}` } }
        })
      )
    )
    const stored = JSON.parse(await readFile(file, 'utf8'))
    expect(Object.keys(stored.byWorkspace).sort()).toEqual(['w1', 'w2', 'w3'])
  })

  it('reads a corrupt file as nothing ticked rather than throwing', async () => {
    await writeViewedFiles(file, 'w1', {
      version: 1,
      files: { 'a.ts': { viewedAt: 1, viewedIdentity: 'd1' } }
    })
    await writeFile(file, '{ not json', 'utf8')
    expect(await readViewedFiles(file, 'w1')).toEqual(EMPTY_VIEWED_FILES_STATE)
  })

  it('forgets a workspace once its last file is unticked', async () => {
    await writeViewedFiles(file, 'w1', {
      version: 1,
      files: { 'a.ts': { viewedAt: 1, viewedIdentity: 'd1' } }
    })
    await writeViewedFiles(file, 'w1', { version: 1, files: {} })
    expect(JSON.parse(await readFile(file, 'utf8')).byWorkspace).toEqual({})
  })
})
