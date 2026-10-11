import type * as Monaco from 'monaco-editor'
import { useAppStore } from '@/store'
import { modelFileFor } from './editor-model-files'
import { openFileContext, trackedFileContext } from './language-server-editor'
import { PREVIEW_SCHEME } from './language-server-preview-models'

export function fileSource(uri: Monaco.Uri) {
  const state = useAppStore.getState()
  const tracked = modelFileFor(uri.toString())
  if (tracked) {
    const context = trackedFileContext(state, tracked)
    // Why: a Peek copy stands in for the file itself; every other registered model is a diff side.
    return context ? { ...context, fromDiff: uri.scheme !== PREVIEW_SCHEME } : null
  }
  // A fragment marks a remote or runtime-owned model; the servers only see local checkouts.
  if (uri.scheme !== 'file' || uri.fragment) {
    return null
  }
  const context = openFileContext(state, uri.fsPath)
  return context ? { filePath: uri.fsPath, ...context, fromDiff: false } : null
}
