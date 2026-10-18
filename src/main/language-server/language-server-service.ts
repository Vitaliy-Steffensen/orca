import { isAbsolute, relative } from 'node:path'
import {
  languageServerForFile,
  type LanguageServerDefinitionResult,
  type LanguageServerHoverResult,
  type LanguageServerLanguage,
  type LanguageServerReferencesResult,
  type LanguageServerRequest
} from '../../shared/language-server'
import { resolveLaunch, type LanguageServerLaunch } from './language-server-launchers'
import type { LspSession } from './lsp-session'
import { createLspSessionPool } from './lsp-session-pool'

const IDLE_MS = 15 * 60_000
const MAX_SESSIONS = 4
const MAX_REFERENCE_FILES = 50

type Session = Pick<LspSession, 'closed' | 'definition' | 'hover' | 'references' | 'dispose'>

function isInside(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

function sessionKey(launch: LanguageServerLaunch): string {
  return `${launch.language}\0${JSON.stringify([launch.program, launch.projectRoot, launch.env, launch.pathPrefix])}`
}

export function createLanguageServerService({
  exists,
  readPreview,
  readFile,
  startSession
}: {
  exists: (path: string) => boolean
  readPreview: (filePath: string, line: number) => string | null
  readFile: (filePath: string) => string | null
  startSession: (launch: LanguageServerLaunch) => Session
}): {
  definition: (request: LanguageServerRequest) => Promise<LanguageServerDefinitionResult>
  hover: (request: LanguageServerRequest) => Promise<LanguageServerHoverResult>
  references: (request: LanguageServerRequest) => Promise<LanguageServerReferencesResult>
  stopLanguage: (language: LanguageServerLanguage) => void
  stopWorktree: (worktreeRoot: string) => void
  disposeAll: () => void
} {
  const launches = new Map<string, LanguageServerLaunch>()
  const lastLaunchByWorktree = new Map<string, LanguageServerLaunch>()
  // Why not derivable from the key: the key holds the project root, which in a
  // monorepo is a package inside the checkout, and a server started from a file
  // outside the checkout keeps the project that led there.
  const worktreeRootsByKey = new Map<string, Set<string>>()
  const pool = createLspSessionPool<Session>({
    start: (key) => {
      const launch = launches.get(key)
      if (!launch) {
        throw new Error('Unknown language server project')
      }
      return startSession(launch)
    },
    idleMs: IDLE_MS,
    maxSessions: MAX_SESSIONS
  })

  const withSession = async <T>(
    request: LanguageServerRequest,
    ask: (session: Session) => Promise<T>
  ): Promise<{ ok: true; value: T } | { ok: false; error: string }> => {
    const { language, filePath, worktreeRoot } = request
    if (
      languageServerForFile(filePath)?.language !== language ||
      !isAbsolute(filePath) ||
      !isAbsolute(worktreeRoot)
    ) {
      return { ok: false, error: `Not a ${language} file in a local worktree.` }
    }
    // Why: a file outside the checkout (a bundled typeshed stub, a global package) has no project
    // of its own, so it goes to the server that led there, with that project's venv.
    const outside =
      !isInside(worktreeRoot, filePath) &&
      !(request.repoRoot && isInside(request.repoRoot, filePath))
    const lastKey = `${language}\0${worktreeRoot}`
    const launch = (outside && lastLaunchByWorktree.get(lastKey)) || resolveLaunch(request, exists)
    if (!outside) {
      lastLaunchByWorktree.set(lastKey, launch)
    }
    const key = sessionKey(launch)
    launches.set(key, launch)
    const roots = worktreeRootsByKey.get(key) ?? new Set<string>()
    roots.add(worktreeRoot)
    worktreeRootsByKey.set(key, roots)
    try {
      return { ok: true, value: await ask(pool.acquire(key)) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  return {
    definition: async (request) => {
      const { filePath, text, line, character } = request
      const result = await withSession(request, (session) =>
        session.definition({ filePath, text, line, character })
      )
      if (!result.ok) {
        return result
      }
      return {
        ok: true,
        locations: result.value.map((location) => {
          const preview = readPreview(location.filePath, location.line)
          return preview === null ? location : { ...location, preview }
        })
      }
    },
    hover: async (request) => {
      const { filePath, text, line, character } = request
      const result = await withSession(request, (session) =>
        session.hover({ filePath, text, line, character })
      )
      return result.ok ? { ok: true, markdown: result.value } : result
    },
    references: async (request) => {
      const { filePath, text, line, character } = request
      const result = await withSession(request, (session) =>
        session.references({ filePath, text, line, character })
      )
      if (!result.ok) {
        return result
      }
      // Why the texts: the peek view shows each reference in its file, and the renderer only
      // holds the files that are open.
      const files: Record<string, string> = {}
      const others = [...new Set(result.value.map((location) => location.filePath))].filter(
        (path) => path !== filePath
      )
      for (const path of others.slice(0, MAX_REFERENCE_FILES)) {
        const content = readFile(path)
        if (content !== null) {
          files[path] = content
        }
      }
      return { ok: true, locations: result.value, files }
    },
    stopLanguage: (language) => pool.disposeMatching((key) => key.startsWith(`${language}\0`)),
    // Why only when no other checkout shares the session: two worktrees can
    // resolve the same project root, and stopping one must not blind the other.
    stopWorktree: (worktreeRoot) => {
      for (const [key, roots] of worktreeRootsByKey) {
        if (!roots.delete(worktreeRoot)) {
          continue
        }
        if (roots.size > 0) {
          continue
        }
        worktreeRootsByKey.delete(key)
        launches.delete(key)
        pool.disposeMatching((candidate) => candidate === key)
      }
      for (const key of lastLaunchByWorktree.keys()) {
        if (key.endsWith(`\0${worktreeRoot}`)) {
          lastLaunchByWorktree.delete(key)
        }
      }
    },
    disposeAll: () => pool.disposeAll()
  }
}
