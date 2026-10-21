import { delimiter } from 'node:path'
import { spawnProcess } from '@orca/process-host'
import { forceTerminateProcessTree } from '@orca/process-host/process-tree-termination'
import type { LanguageServerLaunch } from './language-server-launchers'
import { createLspSession, type LspSession } from './lsp-session'

const STDERR_TAIL_BYTES = 2000

export function languageServerEnvironment(
  { env, pathPrefix }: Pick<LanguageServerLaunch, 'env' | 'pathPrefix'>,
  base: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  if (Object.keys(env).length === 0 && pathPrefix.length === 0) {
    return base
  }
  return {
    ...base,
    ...env,
    PATH: [...pathPrefix, base.PATH].filter(Boolean).join(delimiter)
  }
}

// Why not the raw spawn error: "spawn tsgo ENOENT" reads as a crash, when the server is simply
// not installed, which is the one thing the user can act on.
export function languageServerStartFailure(
  { serverName, program }: Pick<LanguageServerLaunch, 'serverName' | 'program'>,
  error: NodeJS.ErrnoException
): string {
  if (error.code !== 'ENOENT') {
    return `${serverName} could not start: ${error.message}`
  }
  return /[\\/]/.test(program)
    ? `${serverName} is not at ${program}`
    : `${serverName} is not installed in this project, and ${program} is not on PATH`
}

/** The server's own last words, which say more than its exit code. */
export function languageServerExitFailure(
  { serverName }: Pick<LanguageServerLaunch, 'serverName'>,
  stderr: string
): string | undefined {
  const lastLine = stderr.trim().split(/\r?\n/).at(-1)?.trim()
  return lastLine ? `${serverName} exited: ${lastLine}` : undefined
}

export function startLanguageServerSession(launch: LanguageServerLaunch): LspSession {
  const child = spawnProcess({
    program: launch.program,
    args: launch.args,
    cwd: launch.projectRoot,
    env: languageServerEnvironment(launch, process.env),
    detached: process.platform !== 'win32'
  })
  // Why: an unhandled stream error crashes main; a write racing the server's exit raises EPIPE.
  for (const stream of [child.stdin, child.stdout, child.stderr]) {
    stream.on('error', () => {})
  }
  let stderrTail = ''
  child.stderr.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_BYTES)
  })
  return createLspSession({
    rootPath: launch.projectRoot,
    serverName: launch.serverName,
    transport: {
      write: (chunk) => {
        if (child.stdin.writable) {
          child.stdin.write(chunk)
        }
      },
      onData: (listener) => child.stdout.on('data', listener),
      onExit: (listener) => {
        child.once('error', (error: NodeJS.ErrnoException) =>
          listener(languageServerStartFailure(launch, error))
        )
        child.once('close', () => listener(languageServerExitFailure(launch, stderrTail)))
      },
      kill: () => void forceTerminateProcessTree(child)
    }
  })
}
