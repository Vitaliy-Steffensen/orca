import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import {
  LANGUAGE_SERVERS,
  languageServerOptions,
  type LanguageServerLanguage,
  type LanguageServerRequest
} from '../../shared/language-server'
import { resolvePythonProject } from './python-project-resolution'
import { resolveTypeScriptProject } from './typescript-project-resolution'

export type LanguageServerLaunch = {
  language: LanguageServerLanguage
  serverName: string
  projectRoot: string
  program: string
  args: string[]
  env: Record<string, string>
  pathPrefix: string[]
}

type LanguageProject = {
  projectRoot: string
  /** Where the project's own tools live, searched for the server before PATH. */
  binDirs: string[]
  env: Record<string, string>
  pathPrefix: string[]
}

const PROJECTS: Record<
  LanguageServerLanguage,
  (request: LanguageServerRequest, exists: (path: string) => boolean) => LanguageProject
> = {
  python: ({ filePath, worktreeRoot, repoRoot, venvSetting }, exists) => {
    const { projectRoot, venvPath } = resolvePythonProject({
      filePath,
      worktreeRoot,
      repoRoot,
      venvSetting,
      exists
    })
    const venvBin = venvPath ? [join(venvPath, 'bin')] : []
    const env: Record<string, string> = venvPath ? { VIRTUAL_ENV: venvPath } : {}
    // Why VIRTUAL_ENV and PATH: Python servers pick their interpreter, and so site-packages, from
    // the active venv.
    return {
      projectRoot,
      binDirs: venvBin,
      env,
      pathPrefix: venvBin
    }
  },
  typescript: ({ filePath, worktreeRoot, repoRoot }, exists) => ({
    ...resolveTypeScriptProject({ filePath, worktreeRoot, repoRoot, exists }),
    env: {},
    pathPrefix: []
  })
}

// Why: a spawned program gets no shell, so nothing else expands a typed `~/`.
function expandHome(command: string, home: string): string {
  return command === '~' || command.startsWith('~/') ? join(home, command.slice(1)) : command
}

// Why the worktree and not the spawn cwd: the server runs in its project root, so a typed
// `apps/backend/.venv/bin/pyrefly` would otherwise be looked for under `apps/backend`.
// Null means the typed path names nothing, so the usual search stands in for it.
function resolveCommand(
  command: string,
  request: LanguageServerRequest,
  exists: (path: string) => boolean,
  home: string
): string | null {
  const expanded = expandHome(command, home)
  // A bare name means PATH; only a path-shaped entry names a file in the checkout.
  if (!/[\\/]/.test(expanded)) {
    return expanded
  }
  if (isAbsolute(expanded)) {
    return exists(expanded) ? expanded : null
  }
  const { worktreeRoot, repoRoot } = request
  const inWorktree = resolve(worktreeRoot, expanded)
  if (exists(inWorktree)) {
    return inWorktree
  }
  // Why the main checkout too: new worktrees rarely get their own venv or node_modules.
  const inMainCheckout = repoRoot && repoRoot !== worktreeRoot ? resolve(repoRoot, expanded) : null
  return inMainCheckout && exists(inMainCheckout) ? inMainCheckout : null
}

export function resolveLaunch(
  request: LanguageServerRequest,
  exists: (path: string) => boolean,
  home: string = homedir()
): LanguageServerLaunch {
  const { language } = request
  const servers = languageServerOptions(language)
  const server = servers[request.server] ?? servers[LANGUAGE_SERVERS[language].defaultServer]
  const { binDirs, ...project } = PROJECTS[language](request, exists)
  const found = binDirs.map((dir) => join(dir, server.command)).find(exists) ?? server.command
  // Why fall back: a path saved against one checkout names nothing in a worktree that never got
  // its own venv or node_modules, and a dead path is worse than the search it replaced.
  const program =
    (request.command && resolveCommand(request.command, request, exists, home)) || found
  return { language, serverName: server.name, program, args: [...server.args], ...project }
}
