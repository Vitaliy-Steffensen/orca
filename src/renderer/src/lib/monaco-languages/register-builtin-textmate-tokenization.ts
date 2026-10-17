import type * as Monaco from 'monaco-editor'
import type { LanguageRegistration } from 'shiki/core'
import type { createTextMateTokensProvider as createTextMateTokensProviderType } from './textmate-token-provider'

type MonacoModule = typeof Monaco
type TextMateTokensProvider = Monaco.languages.TokensProvider
type ShikiGrammarModule = { default: LanguageRegistration[] }

/**
 * Monaco language id → the Shiki grammar that replaces its Monarch tokenizer.
 *
 * Why at all: Monarch emits a handful of coarse token names (`keyword`, `identifier`, `number`),
 * while a VS Code theme colours fine-grained TextMate scopes (`keyword.control.import.python`).
 * Converting the colours is not enough — the editor has to emit the scopes the theme names, or
 * all of Dark+'s control-flow purple, function yellow and type teal is unreachable.
 *
 * `typescript`/`javascript` take the JSX-aware grammars because Monaco has no separate id for
 * `.tsx`/`.jsx`; those grammars tokenize plain TS and JS identically, so nothing is lost.
 */
const BUILTIN_TEXTMATE_GRAMMARS: Record<string, () => Promise<ShikiGrammarModule>> = {
  python: () => import('shiki/langs/python.mjs'),
  typescript: () => import('shiki/langs/tsx.mjs'),
  javascript: () => import('shiki/langs/jsx.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  'objective-c': () => import('shiki/langs/objc.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  perl: () => import('shiki/langs/perl.mjs'),
  lua: () => import('shiki/langs/lua.mjs'),
  r: () => import('shiki/langs/r.mjs'),
  julia: () => import('shiki/langs/julia.mjs'),
  scala: () => import('shiki/langs/scala.mjs'),
  clojure: () => import('shiki/langs/clojure.mjs'),
  elixir: () => import('shiki/langs/elixir.mjs'),
  dart: () => import('shiki/langs/dart.mjs'),
  shell: () => import('shiki/langs/shellscript.mjs'),
  powershell: () => import('shiki/langs/powershell.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  json: () => import('shiki/langs/jsonc.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  less: () => import('shiki/langs/less.mjs'),
  graphql: () => import('shiki/langs/graphql.mjs'),
  dockerfile: () => import('shiki/langs/docker.mjs'),
  hcl: () => import('shiki/langs/hcl.mjs'),
  protobuf: () => import('shiki/langs/proto.mjs'),
  ini: () => import('shiki/langs/ini.mjs'),
  solidity: () => import('shiki/langs/solidity.mjs'),
  fsharp: () => import('shiki/langs/fsharp.mjs')
}

function loadProviderModule(): Promise<{
  createTextMateTokensProvider: typeof createTextMateTokensProviderType
}> {
  return import('./textmate-token-provider')
}

/**
 * Swaps Monarch for a TextMate grammar on the languages Monaco ships with.
 *
 * Only tokenization is replaced: Monaco's own language configuration keeps owning brackets,
 * comments and indentation. Registering the factory after Monaco's own replaces it, because
 * `registerTokensProviderFactory` disposes the factory already stored for that language.
 */
export function registerBuiltinTextMateTokenization(monaco: MonacoModule): void {
  const registered = new Set(monaco.languages.getLanguages().map((language) => language.id))
  for (const [languageId, loadModule] of Object.entries(BUILTIN_TEXTMATE_GRAMMARS)) {
    // Why: a language Monaco did not register has no model to tokenize, and registering a
    // factory for it would claim an id some later contribution expects to own.
    if (!registered.has(languageId)) {
      continue
    }
    let providerPromise: Promise<TextMateTokensProvider> | undefined
    monaco.languages.registerTokensProviderFactory(languageId, {
      create: () => {
        providerPromise ??= loadProviderModule()
          .then(({ createTextMateTokensProvider }) =>
            createTextMateTokensProvider({
              loadGrammar: () => loadModule().then((module) => module.default)
            })
          )
          .catch((error: unknown) => {
            // Why: returning null leaves the language unhighlighted rather than breaking the
            // editor, and clearing the memo lets the next model retry.
            providerPromise = undefined
            console.warn(`[textmate] ${languageId} grammar unavailable:`, error)
            throw error
          })
        return providerPromise
      }
    })
  }
}

export const BUILTIN_TEXTMATE_LANGUAGE_IDS = Object.keys(BUILTIN_TEXTMATE_GRAMMARS)
