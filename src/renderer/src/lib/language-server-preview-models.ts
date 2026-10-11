import type * as Monaco from 'monaco-editor'
import type { LanguageServerLocation } from '../../../shared/language-server'
import { detectLanguage } from '@/lib/language-detect'
import { trackModelFile, type TrackedModelFile } from './editor-model-files'
import { previewModelText } from './language-server-editor'

export const PREVIEW_SCHEME = 'orca-definition'
const MAX_PREVIEW_MODELS = 80

// Why: a reference copy holds the whole file, so a definition's snippet must not overwrite it.
const wholeFileCopies = new Map<string, () => void>()

export function isWholeFileCopy(uri: Monaco.Uri): boolean {
  return uri.scheme === PREVIEW_SCHEME && wholeFileCopies.has(uri.toString())
}

function forgetWholeFileCopy(uri: string): void {
  wholeFileCopies.get(uri)?.()
  wholeFileCopies.delete(uri)
}

function previewUri(monaco: typeof Monaco, filePath: string): Monaco.Uri {
  return monaco.Uri.file(filePath).with({ scheme: PREVIEW_SCHEME })
}

function openFileModel(monaco: typeof Monaco, filePath: string): Monaco.editor.ITextModel | null {
  return monaco.editor.getModel(monaco.Uri.file(filePath))
}

function createPreviewModel(
  monaco: typeof Monaco,
  uri: Monaco.Uri,
  text: string,
  language: string
): void {
  const previews = monaco.editor.getModels().filter((model) => model.uri.scheme === PREVIEW_SCHEME)
  for (const stale of previews.slice(0, Math.max(0, previews.length - MAX_PREVIEW_MODELS + 1))) {
    forgetWholeFileCopy(stale.uri.toString())
    stale.dispose()
  }
  monaco.editor.createModel(text, language, uri)
}

// Why a model per target: standalone Monaco underlines a Cmd+hovered name and shows a peek only
// for models it already holds, and it loads none by itself.
export function definitionModelUri(
  monaco: typeof Monaco,
  location: LanguageServerLocation
): Monaco.Uri {
  const open = openFileModel(monaco, location.filePath)
  if (open) {
    return open.uri
  }
  const uri = previewUri(monaco, location.filePath)
  if (wholeFileCopies.has(uri.toString())) {
    return uri
  }
  const text = previewModelText(location)
  const existing = monaco.editor.getModel(uri)
  if (!existing) {
    createPreviewModel(monaco, uri, text, 'plaintext')
  } else if (existing.getValue() !== text) {
    existing.setValue(text)
  }
  return uri
}

// Why register the copy: Peek shows a file with no tab through it, and it has to answer hover,
// Cmd+click and references the way that file would.
export function referenceModelUri(
  monaco: typeof Monaco,
  filePath: string,
  text: string | undefined,
  file: TrackedModelFile
): Monaco.Uri | null {
  const open = openFileModel(monaco, filePath)
  if (open) {
    return open.uri
  }
  if (text === undefined) {
    return null
  }
  const uri = previewUri(monaco, filePath)
  const language = detectLanguage(filePath)
  const existing = monaco.editor.getModel(uri)
  if (!existing) {
    createPreviewModel(monaco, uri, text, language)
  } else {
    if (existing.getValue() !== text) {
      existing.setValue(text)
    }
    if (existing.getLanguageId() !== language) {
      monaco.editor.setModelLanguage(existing, language)
    }
  }
  const key = uri.toString()
  forgetWholeFileCopy(key)
  wholeFileCopies.set(key, trackModelFile(key, file))
  return uri
}

export function wordRangeAt(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel | null,
  lineNumber: number,
  column: number
): Monaco.Range {
  const word =
    model && lineNumber <= model.getLineCount()
      ? model.getWordAtPosition({ lineNumber, column })
      : null
  return word
    ? new monaco.Range(lineNumber, word.startColumn, lineNumber, word.endColumn)
    : new monaco.Range(lineNumber, column, lineNumber, column)
}
