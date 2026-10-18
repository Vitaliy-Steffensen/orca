import path from 'node:path'
import type { RuntimeWorktreeRecord } from '../../shared/runtime-types'
import { isRuntimePathAbsolute, relativePathInsideRoot } from '../../shared/cross-platform-path'
import type { HandlerContext } from '../dispatch'
import { getOptionalPositiveIntegerFlag, getRequiredStringFlag } from '../flags'
import { RuntimeClientError } from '../runtime-client'
import { getOptionalWorktreeSelector, resolveCurrentWorktreeSelector } from '../selectors'

/** The flags every comment on a line of a file shares: where it is, and what it says. */

export async function getCommentWorktreeSelector({
  flags,
  cwd,
  client
}: HandlerContext): Promise<string> {
  const explicit = await getOptionalWorktreeSelector(flags, 'worktree', cwd, client)
  if (explicit) {
    return explicit
  }
  if (client.isRemote) {
    throw new RuntimeClientError(
      'invalid_argument',
      'This command requires --worktree when it runs against a remote runtime, because the client cwd cannot identify a server worktree.'
    )
  }
  return await resolveCurrentWorktreeSelector(cwd, client)
}

export async function resolveCommentFilePath(
  ctx: HandlerContext,
  worktree: string,
  file: string
): Promise<string> {
  const { result } = await ctx.client.call<{ worktree: RuntimeWorktreeRecord }>('worktree.show', {
    worktree
  })
  const rootPath = result.worktree.path
  const fromCwd = isRuntimePathAbsolute(file) ? file : path.resolve(ctx.cwd, file)
  const relative =
    relativePathInsideRoot(rootPath, fromCwd) ??
    (isRuntimePathAbsolute(file)
      ? null
      : relativePathInsideRoot(rootPath, path.join(rootPath, file)))
  if (!relative) {
    throw new RuntimeClientError('invalid_argument', `${file} is not a file inside the worktree.`)
  }
  return relative.split(path.sep).join('/')
}

export function requireCommentLine(ctx: HandlerContext, name: string): number {
  const line = getOptionalPositiveIntegerFlag(ctx.flags, name)
  if (line === undefined) {
    throw new RuntimeClientError('invalid_argument', `Missing --${name}.`)
  }
  return line
}

export function defaultAgentName(): string {
  return process.env.CLAUDECODE === '1' ? 'Claude Code' : 'Agent'
}

// Why: agents pass paragraphs as `\n` inside one quoted argument, which the shell keeps as two
// characters; `\\n` stays a literal `\n` for a note that is about the escape itself.
export function unescapeCommentBody(body: string): string {
  return body.replace(/\\\\n|\\n/g, (match) => (match === '\\n' ? '\n' : '\\n'))
}

export function commentBody(ctx: HandlerContext): string {
  return unescapeCommentBody(getRequiredStringFlag(ctx.flags, 'body'))
}

export function commentLineLabel(comment: { startLine?: number; line: number }): string {
  return comment.startLine !== undefined && comment.startLine !== comment.line
    ? `${comment.startLine}-${comment.line}`
    : `${comment.line}`
}
