import { existsSync, readFileSync, statSync } from 'node:fs'
import { createLanguageServerService } from './language-server-service'
import { startLanguageServerSession } from './language-server-process'

const PREVIEW_LINES = 10
const MAX_PREVIEW_FILE_BYTES = 5_000_000

function readFile(filePath: string): string | null {
  try {
    return statSync(filePath).size > MAX_PREVIEW_FILE_BYTES ? null : readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function readPreview(filePath: string, line: number): string | null {
  return (
    readFile(filePath)
      ?.split(/\r?\n/)
      .slice(line, line + PREVIEW_LINES)
      .join('\n') ?? null
  )
}

let service: ReturnType<typeof createLanguageServerService> | null = null

// Why one instance for both callers: this window's IPC and a paired client's RPC ask the same
// host, and a second service would start a second pyrefly per project.
export function languageServerHost(): ReturnType<typeof createLanguageServerService> {
  service ??= createLanguageServerService({
    exists: existsSync,
    readPreview,
    readFile,
    startSession: startLanguageServerSession
  })
  return service
}

export function disposeLanguageServerHost(): void {
  service?.disposeAll()
  service = null
}
