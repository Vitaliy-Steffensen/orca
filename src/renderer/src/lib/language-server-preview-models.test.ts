import type * as Monaco from 'monaco-editor'
import { describe, expect, it } from 'vitest'
import { modelFileFor } from './editor-model-files'
import { isWholeFileCopy, referenceModelUri } from './language-server-preview-models'

type FakeUri = { scheme: string; path: string; toString: () => string }

function fakeUri(
  scheme: string,
  path: string
): FakeUri & { with: (c: { scheme: string }) => FakeUri } {
  return {
    scheme,
    path,
    toString: () => `${scheme}:${path}`,
    with: ({ scheme: next }) => fakeUri(next, path)
  }
}

function fakeMonaco(openPaths: string[] = []): typeof Monaco {
  const models = new Map<string, { uri: FakeUri; value: string; language: string }>()
  for (const path of openPaths) {
    const uri = fakeUri('file', path)
    models.set(uri.toString(), { uri, value: '', language: 'typescript' })
  }
  const asModel = (entry: { uri: FakeUri; value: string; language: string }) => ({
    uri: entry.uri,
    getValue: () => entry.value,
    setValue: (value: string) => {
      entry.value = value
    },
    getLanguageId: () => entry.language,
    dispose: () => models.delete(entry.uri.toString())
  })
  return {
    Uri: { file: (path: string) => fakeUri('file', path) },
    editor: {
      getModel: (uri: FakeUri) => {
        const entry = models.get(uri.toString())
        return entry ? asModel(entry) : null
      },
      getModels: () => [...models.values()].map(asModel),
      createModel: (value: string, language: string, uri: FakeUri) => {
        models.set(uri.toString(), { uri, value, language })
      },
      setModelLanguage: () => {}
    }
  } as unknown as typeof Monaco
}

const file = { worktreeId: 'wt-1', relativePath: 'apps/frontend/b.ts' }

describe('reference preview models', () => {
  it('registers a copy of a file with no tab as that worktree file', () => {
    const uri = referenceModelUri(
      fakeMonaco(),
      '/wt/apps/frontend/b.ts',
      'export const b = 1',
      file
    )

    expect(uri?.scheme).toBe('orca-definition')
    expect(isWholeFileCopy(uri!)).toBe(true)
    expect(modelFileFor(uri!.toString())).toEqual(file)
  })

  it("uses an open file's own model and leaves its registration alone", () => {
    const uri = referenceModelUri(
      fakeMonaco(['/wt/apps/frontend/b.ts']),
      '/wt/apps/frontend/b.ts',
      'x',
      file
    )

    expect(uri?.scheme).toBe('file')
    expect(modelFileFor(uri!.toString())).toBeUndefined()
  })
})
