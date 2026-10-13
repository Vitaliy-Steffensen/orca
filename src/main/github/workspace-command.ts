import { runProcess } from '@orca/process-host'
import type { WorkspaceCommandResult } from '../../shared/github/workspace-command'

const DEFAULT_TIMEOUT_MS = 5 * 60_000
const MAX_OUTPUT_CHARS = 4000

// Fork: runs a PR-rule command (e.g. stopping the workspace's dev stack) the way setup hooks run,
// with the app's environment and bash, headless because the workspace may have no mounted terminal.
export async function runWorkspaceCommand(
  command: string,
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<WorkspaceCommandResult> {
  const isWindows = process.platform === 'win32'
  try {
    const result = await runProcess(
      {
        program: isWindows ? (process.env.ComSpec ?? 'cmd.exe') : '/bin/bash',
        args: isWindows ? ['/d', '/s', '/c', command] : ['-c', command],
        cwd,
        env: process.env,
        timeoutMs,
        // Why its own group: the shell's children (docker compose, moon) must die with it on timeout.
        detached: !isWindows
      },
      'tail'
    )
    const output = [result.stdout, result.stderr]
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n')
      .slice(-MAX_OUTPUT_CHARS)
    if (result.timedOut) {
      return { success: false, output: `${output}\nThe command timed out.`.trim() }
    }
    return { success: result.code === 0, output }
  } catch (error) {
    return { success: false, output: error instanceof Error ? error.message : String(error) }
  }
}
