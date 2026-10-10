import type * as Monaco from 'monaco-editor'
import { useAppStore } from '@/store'
import { modelFileFor } from './diff-editor-model-files'
import { openFileContext, trackedFileContext, unopenedFileContext } from './language-server-editor'
import { isWholeFileCopy } from './language-server-preview-models'

export function fileSource(uri: Monaco.Uri) {
  const state = useAppStore.getState()
  const tracked = modelFileFor(uri.toString())
  if (tracked) {
    const context = trackedFileContext(state, tracked)
    return context ? { ...context, fromDiff: true } : null
  }
  // Why: Peek shows a file with no tab as a whole-file copy, which the server can read like the file.
  if (isWholeFileCopy(uri)) {
    const context = unopenedFileContext(state, uri.fsPath)
    return context ? { filePath: uri.fsPath, ...context, fromDiff: false } : null
  }
  // A fragment marks a remote or runtime-owned model; the servers only see local checkouts.
  if (uri.scheme !== 'file' || uri.fragment) {
    return null
  }
  const context = openFileContext(state, uri.fsPath)
  return context ? { filePath: uri.fsPath, ...context, fromDiff: false } : null
}
