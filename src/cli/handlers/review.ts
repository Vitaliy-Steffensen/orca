import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { PendingReviewComment } from '../../shared/github/pending-review-comment'
import {
  REVIEW_ASSET_MAX_BYTES,
  reviewAssetContentTypeForName,
  reviewAssetKind,
  type ReviewAssetKind
} from '../../shared/github/review-asset'
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

/**
 * The attachment this path names, read here rather than in the main process.
 *
 * Why here: the CLI can run on a different host than the app — SSH, `orca serve`, a relay — so a
 * path the main process opened would be a different file, or none. The size is checked before the
 * round trip so an oversized file costs nothing.
 */
async function readReviewAsset(
  cwd: string,
  file: string
): Promise<{ name: string; contentType: string; base64: string; kind: ReviewAssetKind }> {
  const absolute = path.resolve(cwd, file)
  const name = path.basename(absolute)
  const contentType = reviewAssetContentTypeForName(name)
  const kind = contentType ? reviewAssetKind(contentType) : null
  if (!contentType || !kind) {
    throw new RuntimeClientError(
      'invalid_argument',
      `${name} is not an image or video GitHub accepts: use .png, .jpg, .gif, .webp, .mp4, .mov or .webm.`
    )
  }
  const size = await stat(absolute).then(
    (stats) => stats.size,
    () => null
  )
  if (size === null) {
    throw new RuntimeClientError('not_found', `No file at ${absolute}.`)
  }
  if (size > REVIEW_ASSET_MAX_BYTES[kind]) {
    throw new RuntimeClientError(
      'invalid_argument',
      `GitHub takes ${kind}s up to ${REVIEW_ASSET_MAX_BYTES[kind] / (1024 * 1024)} MB; ${name} is larger.`
    )
  }
  return { name, contentType, base64: (await readFile(absolute)).toString('base64'), kind }
}

function formatCommentRow(comment: PendingReviewComment): string {
  const author = comment.agentAuthor ? `[${comment.agentAuthor.name}] ` : ''
  const status = comment.status === 'proposed' ? 'proposed' : 'accepted'
  return `${comment.id}  ${status}  ${comment.path}:${commentLineLabel(comment)}  ${author}${comment.body.replace(/\s+/g, ' ')}`
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
        `Proposed review comment ${comment.id} on ${comment.path}:${commentLineLabel(comment)} (${pendingCount} waiting for the user to accept).`
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
  },
  'review summary show': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const response = await ctx.client.call<{ body: string }>('reviewSummary.get', { worktree })
    printResult(response, ctx.json, ({ body }) => body || 'The review summary is empty.')
  },
  'review asset upload': async (ctx) => {
    const worktree = await getCommentWorktreeSelector(ctx)
    const asset = await readReviewAsset(ctx.cwd, getRequiredStringFlag(ctx.flags, 'file'))
    const response = await ctx.client.call<{ url: string; kind: ReviewAssetKind }>(
      'reviewAsset.upload',
      {
        worktree,
        name: asset.name,
        contentType: asset.contentType,
        base64: asset.base64
      }
    )
    printResult(response, ctx.json, ({ url }) => url)
  }
}
