import { describe, expect, it, vi } from 'vitest'
import type * as Monaco from 'monaco-editor'
import { loadNodeOniguruma } from '../syntax-highlighting/oniguruma-test-harness'
import { createTextMateTokensProvider, type TextMateGrammarLoader } from './textmate-token-provider'
import {
  BUILTIN_TEXTMATE_LANGUAGE_IDS,
  registerBuiltinTextMateTokenization,
  type MonacoTokenizationRegistry
} from './register-builtin-textmate-tokenization'

vi.mock('../syntax-highlighting/oniguruma', () => ({ loadOniguruma: loadNodeOniguruma }))

type FactoryCall = { languageId: string; factory: Monaco.languages.TokensProviderFactory }

function fakeMonaco(registeredIds: string[]): {
  monaco: MonacoTokenizationRegistry
  calls: FactoryCall[]
} {
  const calls: FactoryCall[] = []
  const monaco: MonacoTokenizationRegistry = {
    languages: {
      getLanguages: () => registeredIds.map((id) => ({ id })),
      registerTokensProviderFactory: (languageId, factory) => {
        calls.push({ languageId, factory })
        return { dispose: () => undefined }
      }
    }
  }
  return { monaco, calls }
}

async function scopesOf(loadGrammar: TextMateGrammarLoader, lines: string[]): Promise<string[][]> {
  const provider = await createTextMateTokensProvider({ loadGrammar })
  let state = provider.getInitialState()
  return lines.map((line) => {
    const result = provider.tokenize(line, state)
    state = result.endState
    return result.tokens.map((token) => token.scopes)
  })
}

describe('built-in TextMate tokenization', () => {
  it('emits the control-keyword scope Monarch cannot, so a VS Code theme reaches it', async () => {
    const [importLine, defLine] = await scopesOf(
      () => import('shiki/langs/python.mjs').then((module) => module.default),
      ['from typing import Self', 'def pick(value):']
    )

    // Why these two: Monarch paints every Python keyword with one flat `keyword` token, which is
    // why `from`/`import` came out the same blue as `def` instead of Dark+'s control-flow purple.
    expect(importLine).toContain('keyword.control.import.python')
    expect(defLine).toContain('storage.type.function.python')
    expect(defLine).toContain('entity.name.function.python')
  })

  it('tokenizes JSX and plain TypeScript generics with the one TSX grammar', async () => {
    const [generic, jsx] = await scopesOf(
      () => import('shiki/langs/tsx.mjs').then((module) => module.default),
      ['function pick<T extends object>(o: T) {}', 'const el = <div className="x" />']
    )

    expect(generic).toContain('entity.name.function.tsx')
    expect(generic).toContain('entity.name.type.tsx')
    expect(jsx).toContain('entity.name.tag.tsx')
    expect(jsx).toContain('entity.other.attribute-name.tsx')
  })

  it('registers a replacement factory only for languages Monaco already has', () => {
    const { monaco, calls } = fakeMonaco(['python', 'typescript', 'nim'])

    registerBuiltinTextMateTokenization(monaco)

    expect(calls.map((call) => call.languageId)).toEqual(['python', 'typescript'])
    expect(BUILTIN_TEXTMATE_LANGUAGE_IDS).toContain('python')
    expect(BUILTIN_TEXTMATE_LANGUAGE_IDS).not.toContain('nim')
  })

  it('creates each language provider once and keeps Monaco asking after a failure', async () => {
    const { monaco, calls } = fakeMonaco(['python'])
    registerBuiltinTextMateTokenization(monaco)
    const factory = calls[0]?.factory

    const first = factory?.create()
    const second = factory?.create()

    expect(first).toBe(second)
    await expect(first).resolves.toMatchObject({ tokenize: expect.any(Function) })
  })
})
