import type { PendingReviewComment } from '../../shared/github/pending-review-comment'
import type { CommandHandler } from '../dispatch'
import {
  getOptionalPositiveIntegerFlag,
  getOptionalStringFlag,
  getRequiredStringFlag,
  getRequiredStringFlagAllowingEmpty
} from '../flags'
import { printResult } from '../format'
import { RuntimeClientError } from '../runtime-client'
import {
  commentBody,
  commentLineLabel,
  defaultAgentName,
  getCommentWorktreeSelector,
  requireCommentLine,
  resolveCommentFilePath,
  unescapeCommentBody
} from './comment-anchor-flags'

function formatCommentRow(comment: PendingReviewComment): string {
  const author = comment.agentAuthor ? `[${comment.agentAuthor.name}] ` : ''
  return `${comment.id}  ${comment.path}:${commentLineLabel(comment)}  ${author}${comment.body.replace(/\s+/g, ' ')}`
}

export const REVIEW_HANDLERS: Record<string, CommandHandler> = {
  'review comment add': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const startLine = requireCommentLine(ctx, 'line')
    const endLine = getOptionalPositiveIntegerFlag(ctx.flags, 'end-line')
    if (endLine !== undefined && endLine < startLine) {
      throw new RuntimeClientError('invalid_argument', '--end-line must not be before --line.')
    }
    const body = commentBody(ctx)
    const agent = getOptionalStringFlag(ctx.flags, 'agent') ?? defaultAgentName()
    const path = await resolveCommentFilePath(
      ctx,
      worktree,
      getRequiredStringFlag(ctx.flags, 'file')
    )
    const response = await ctx.client.call<{
      comment: PendingReviewComment
      pendingCount: number
    }>('reviewComment.add', {
      worktree,
      path,
      ...(endLine !== undefined && endLine !== startLine
        ? { startLine, line: endLine }
        : { line: startLine }),
      body,
      agent
    })
    printResult(
      response,
      ctx.json,
      ({ comment, pendingCount }) =>
        `Staged review comment ${comment.id} on ${comment.path}:${commentLineLabel(comment)} (${pendingCount} waiting to be submitted).`
    )
  },
  'review comment list': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const response = await ctx.client.call<{ comments: PendingReviewComment[] }>(
      'reviewComment.list',
      { worktree }
    )
    printResult(response, ctx.json, ({ comments }) =>
      [`Staged review comments (${comments.length})`, ...comments.map(formatCommentRow)].join('\n')
    )
  },
  'review comment rm': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const id = getRequiredStringFlag(ctx.flags, 'id')
    const response = await ctx.client.call<{ removed: boolean }>('reviewComment.remove', {
      worktree,
      id
    })
    if (!response.result.removed) {
      throw new RuntimeClientError('not_found', `No staged review comment ${id} in this workspace.`)
    }
    printResult(response, ctx.json, () => `Removed staged review comment ${id}.`)
  },
  'review summary set': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    // Why empty is allowed here: `--body ''` is how the summary box is cleared.
    const body = unescapeCommentBody(getRequiredStringFlagAllowingEmpty(ctx.flags, 'body'))
    const response = await ctx.client.call<{ body: string }>('reviewSummary.set', {
      worktree,
      body
    })
    printResult(response, ctx.json, () =>
      body ? 'Wrote the review summary.' : 'Cleared the review summary.'
    )
  }
}
