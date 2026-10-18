import type { DiffComment } from '../../shared/diff-comment-types'
import type { CommandHandler } from '../dispatch'
import {
  getOptionalPositiveIntegerFlag,
  getOptionalStringFlag,
  getRequiredStringFlag
} from '../flags'
import { printResult } from '../format'
import { RuntimeClientError } from '../runtime-client'
import {
  commentBody,
  commentLineLabel,
  defaultAgentName,
  getCommentWorktreeSelector,
  requireCommentLine,
  resolveCommentFilePath
} from './comment-anchor-flags'

type NoteListResult = { userNotes: DiffComment[]; agentNotes: DiffComment[] }

function lineLabel(note: Pick<DiffComment, 'startLine' | 'lineNumber'>): string {
  return commentLineLabel({ startLine: note.startLine, line: note.lineNumber })
}

function formatNoteRow(note: DiffComment): string {
  const author = note.agentAuthor ? `[${note.agentAuthor.name}] ` : ''
  return `${note.id}  ${note.filePath}:${lineLabel(note)}  ${author}${note.body.replace(/\s+/g, ' ')}`
}

function formatNoteList(result: NoteListResult): string {
  return [
    `User notes (${result.userNotes.length})`,
    ...result.userNotes.map(formatNoteRow),
    `Agent notes (${result.agentNotes.length})`,
    ...result.agentNotes.map(formatNoteRow)
  ].join('\n')
}

export const NOTES_HANDLERS: Record<string, CommandHandler> = {
  'notes add': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const startLine = requireCommentLine(ctx, 'line')
    const endLine = getOptionalPositiveIntegerFlag(ctx.flags, 'end-line')
    if (endLine !== undefined && endLine < startLine) {
      throw new RuntimeClientError('invalid_argument', '--end-line must not be before --line.')
    }
    const body = commentBody(ctx)
    const agent = getOptionalStringFlag(ctx.flags, 'agent') ?? defaultAgentName()
    const githubCommentUrl = getOptionalStringFlag(ctx.flags, 'github-comment')
    const filePath = await resolveCommentFilePath(
      ctx,
      worktree,
      getRequiredStringFlag(ctx.flags, 'file')
    )
    const response = await ctx.client.call<{ note: DiffComment }>('agentNote.add', {
      worktree,
      filePath,
      ...(endLine !== undefined && endLine !== startLine
        ? { startLine, line: endLine }
        : { line: startLine }),
      body,
      agent,
      ...(githubCommentUrl ? { githubCommentUrl } : {})
    })
    printResult(
      response,
      ctx.json,
      ({ note }) => `Added agent note ${note.id} on ${note.filePath}:${lineLabel(note)}.`
    )
  },
  'notes reply': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const noteId = getRequiredStringFlag(ctx.flags, 'id')
    const response = await ctx.client.call<{ note: DiffComment }>('agentNote.reply', {
      worktree,
      noteId,
      body: commentBody(ctx),
      agent: getOptionalStringFlag(ctx.flags, 'agent') ?? defaultAgentName()
    })
    printResult(
      response,
      ctx.json,
      ({ note }) => `Replied to note ${noteId} on ${note.filePath}:${lineLabel(note)}.`
    )
  },
  'notes list': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const response = await ctx.client.call<NoteListResult>('agentNote.list', { worktree })
    printResult(response, ctx.json, formatNoteList)
  },
  'notes rm': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const id = getRequiredStringFlag(ctx.flags, 'id')
    const response = await ctx.client.call<{ removed: boolean }>('agentNote.remove', {
      worktree,
      id
    })
    if (!response.result.removed) {
      throw new RuntimeClientError('not_found', `No agent note ${id} in this worktree.`)
    }
    printResult(response, ctx.json, () => `Removed agent note ${id}.`)
  }
}
