import { app, ipcMain } from 'electron'
import { isLanguageServerLanguage, type LanguageServerRequest } from '../../shared/language-server'
import { LanguageServerAsk } from '../../shared/rpc-contract/language-server-params'
import {
  disposeLanguageServerHost,
  languageServerHost
} from '../language-server/language-server-host'

function readRequest(value: unknown): LanguageServerRequest | null {
  const parsed = LanguageServerAsk.safeParse(value)
  return parsed.success ? parsed.data : null
}

function readWorktreeRoot(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('worktreeRoot' in value)) {
    return null
  }
  const { worktreeRoot } = value
  return typeof worktreeRoot === 'string' && worktreeRoot ? worktreeRoot : null
}

// Fork: Cmd+click and hover ask a language server (pyrefly for Python, tsgo for TypeScript).
export function registerLanguageServerHandlers(): void {
  const service = languageServerHost()
  ipcMain.handle('languageServer:definition', async (_event, args: unknown) => {
    const request = readRequest(args)
    return request
      ? service.definition(request)
      : { ok: false, error: 'Invalid language server request.' }
  })
  ipcMain.handle('languageServer:hover', async (_event, args: unknown) => {
    const request = readRequest(args)
    return request
      ? service.hover(request)
      : { ok: false, error: 'Invalid language server request.' }
  })
  ipcMain.handle('languageServer:references', async (_event, args: unknown) => {
    const request = readRequest(args)
    return request
      ? service.references(request)
      : { ok: false, error: 'Invalid language server request.' }
  })
  ipcMain.handle('languageServer:stop', (_event, args: unknown) => {
    const language = (args as { language?: unknown } | null)?.language
    if (isLanguageServerLanguage(language)) {
      service.stopLanguage(language)
    }
  })
  ipcMain.handle('languageServer:stopWorktree', (_event, args: unknown) => {
    const worktreeRoot = readWorktreeRoot(args)
    if (worktreeRoot) {
      service.stopWorktree(worktreeRoot)
    }
  })
  app.once('will-quit', disposeLanguageServerHost)
}
