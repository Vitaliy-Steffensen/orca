import type * as Monaco from 'monaco-editor'
import {
  LANGUAGE_SERVER_LANGUAGES,
  LANGUAGE_SERVERS,
  languageServerForMonacoLanguage,
  languageServerSettings,
  type LanguageServerLanguage,
  type LanguageServerLocation,
  type LanguageServerRequest
} from '../../../shared/language-server'
import { useAppStore } from '@/store'
import { definitionOpenTarget, toEditorPosition } from './language-server-editor'
import { askLanguageServer, stopLanguageServers } from './language-server-client'
import {
  forgetLanguageServerFailures,
  reportLanguageServerFailure
} from './language-server-failure-toast'
import { fileSource } from './language-server-file-source'
import { RENDERER_LANGUAGE_SERVERS, type LanguageServerFallback } from './language-server-languages'
import {
  definitionModelUri,
  referenceModelUri,
  wordRangeAt
} from './language-server-preview-models'

type SourcedRequest = LanguageServerRequest & NonNullable<ReturnType<typeof fileSource>>

function serverRequest(
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): SourcedRequest | null {
  const language = languageServerForMonacoLanguage(model.getLanguageId())
  const settings = language
    ? languageServerSettings(useAppStore.getState().settings, language)
    : null
  if (!language || !settings?.enabled) {
    return null
  }
  const source = fileSource(model.uri)
  return source
    ? {
        ...source,
        language,
        server: settings.server,
        command: settings.command,
        text: model.getValue(),
        line: position.lineNumber - 1,
        character: position.column - 1
      }
    : null
}

function referenceLocations(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  request: SourcedRequest,
  locations: readonly LanguageServerLocation[],
  files: Record<string, string>
): Monaco.languages.Location[] {
  const state = useAppStore.getState()
  return locations.flatMap((location) => {
    const target = definitionOpenTarget(state, request.worktreeId, location.filePath)
    // Why the asking model for its own file: a diff side keeps its references in the diff.
    const uri =
      location.filePath === request.filePath
        ? model.uri
        : target &&
          referenceModelUri(monaco, location.filePath, files[location.filePath], {
            worktreeId: target.worktreeId,
            relativePath: target.relativePath
          })
    if (!uri) {
      return []
    }
    const { lineNumber, column } = toEditorPosition(location)
    return [{ uri, range: wordRangeAt(monaco, monaco.editor.getModel(uri), lineNumber, column) }]
  })
}

function installLanguageProviders(
  monaco: typeof Monaco,
  languageId: string,
  fallback: LanguageServerFallback | undefined
): void {
  monaco.languages.registerDefinitionProvider(languageId, {
    provideDefinition: async (model, position) => {
      const request = serverRequest(model, position)
      if (request) {
        const result = await askLanguageServer(request.target, 'definition', request)
        if (!result.ok) {
          reportLanguageServerFailure(request, result.error)
        }
        const location = result.ok ? result.locations[0] : undefined
        if (location) {
          const { lineNumber, column } = toEditorPosition(location)
          // Why the asking model for a same-file hit: the jump then stays in that editor.
          const uri =
            location.filePath === request.filePath
              ? model.uri
              : definitionModelUri(monaco, location)
          // Why the whole name: clicking a declaration then reads as "already here", and Monaco
          // shows its references instead, like VS Code.
          return {
            uri,
            range: wordRangeAt(monaco, monaco.editor.getModel(uri), lineNumber, column)
          }
        }
      }
      return fallback ? fallback.definition(model, position) : null
    }
  })

  monaco.languages.registerHoverProvider(languageId, {
    provideHover: async (model, position) => {
      const request = serverRequest(model, position)
      const result = request ? await askLanguageServer(request.target, 'hover', request) : null
      // Why here too: hover is what a reader reaches for first, so a silent fall back to nothing
      // (Python) or to the open-files-only built-in (TypeScript) is the whole bug report.
      if (request && result && !result.ok) {
        reportLanguageServerFailure(request, result.error)
      }
      if (result?.ok && result.markdown) {
        const word = model.getWordAtPosition(position)
        return {
          contents: [{ value: result.markdown }],
          range: word
            ? new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              )
            : undefined
        }
      }
      return fallback ? fallback.hover(model, position) : null
    }
  })

  monaco.languages.registerReferenceProvider(languageId, {
    provideReferences: async (model, position) => {
      const request = serverRequest(model, position)
      if (request) {
        const result = await askLanguageServer(request.target, 'references', request)
        if (result.ok) {
          return referenceLocations(monaco, model, request, result.locations, result.files)
        }
        reportLanguageServerFailure(request, result.error)
      }
      return fallback ? fallback.references(model, position) : null
    }
  })
}

function settingsKey(language: LanguageServerLanguage): string {
  return JSON.stringify(languageServerSettings(useAppStore.getState().settings, language))
}

// Fork: hover, Cmd+click and references for every language in the registry, the same in a tab, a
// diff side or a Peek copy, since all three resolve their file through `fileSource`.
export function installLanguageServerProviders(
  monaco: typeof Monaco,
  monacoTS: typeof Monaco.typescript
): void {
  for (const language of LANGUAGE_SERVER_LANGUAGES) {
    const fallback = RENDERER_LANGUAGE_SERVERS[language].fallback?.(monaco, monacoTS)
    for (const languageId of LANGUAGE_SERVERS[language].monacoLanguageIds) {
      installLanguageProviders(monaco, languageId, fallback)
    }
  }

  // Why stop on any change: a different server, path or off switch leaves the old process idle.
  const keys = new Map(
    LANGUAGE_SERVER_LANGUAGES.map((language) => [language, settingsKey(language)])
  )
  useAppStore.subscribe((state, previous) => {
    if (state.settings === previous.settings) {
      return
    }
    for (const language of LANGUAGE_SERVER_LANGUAGES) {
      const next = settingsKey(language)
      if (keys.get(language) !== next) {
        keys.set(language, next)
        forgetLanguageServerFailures([language])
        void stopLanguageServers(language)
      }
    }
  })
}
