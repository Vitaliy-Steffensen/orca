import { randomUUID } from 'node:crypto'
import {
  addPendingReviewComment,
  removePendingReviewComment,
  type PendingReviewComment
} from '../../../../shared/github/pending-review-comment'
import {
  ReviewCommentAdd,
  ReviewCommentList,
  ReviewCommentRemove,
  ReviewSummarySet
} from '../../../../shared/rpc-contract/review-draft-params'
import {
  readPendingReviewDrafts,
  updatePendingReviewDrafts,
  writePendingReviewSummary
} from '../../../github/pending-review-draft-store'
import {
  getPendingReviewDraftSurface,
  type PendingReviewDraftSurface
} from '../../../github/pending-review-draft-surface'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { defineMethod } from '../core'

const NO_REVIEW_SURFACE =
  'This runtime keeps no review queue. Staged review comments live on the device whose Orca app submits the review, and a headless server (orca serve) has no reviewer sitting in front of it — staging here would write where nobody looks. Stage from the device the pull request is reviewed on, or leave an agent note with `orca notes add`.'

function requireSurface(): PendingReviewDraftSurface {
  const surface = getPendingReviewDraftSurface()
  if (!surface) {
    throw new Error(NO_REVIEW_SURFACE)
  }
  return surface
}

async function resolveWorktreeId(runtime: OrcaRuntimeService, selector: string): Promise<string> {
  return (await runtime.showManagedWorktree(selector)).id
}

export const REVIEW_DRAFT_METHODS = [
  defineMethod({
    name: 'reviewComment.add',
    permission: 'workspace',
    params: ReviewCommentAdd,
    handler: async (params, { runtime }) => {
      const surface = requireSurface()
      const worktreeId = await resolveWorktreeId(runtime, params.worktree)
      const comment: PendingReviewComment = {
        id: randomUUID(),
        path: params.path,
        line: params.line,
        ...(params.startLine !== undefined && params.startLine !== params.line
          ? { startLine: params.startLine }
          : {}),
        body: params.body,
        createdAt: Date.now(),
        agentAuthor: { kind: 'agent', name: params.agent }
      }
      const comments = await updatePendingReviewDrafts(surface.file(), worktreeId, (queue) =>
        addPendingReviewComment(queue, comment)
      )
      surface.announceChange({ worktreeId, comments })
      return { comment, pendingCount: comments.length }
    }
  }),
  defineMethod({
    name: 'reviewComment.list',
    permission: 'workspace',
    params: ReviewCommentList,
    handler: async (params, { runtime }) => {
      const surface = requireSurface()
      const worktreeId = await resolveWorktreeId(runtime, params.worktree)
      const drafts = await readPendingReviewDrafts(surface.file())
      return { comments: drafts[worktreeId] ?? [] }
    }
  }),
  defineMethod({
    name: 'reviewComment.remove',
    permission: 'workspace',
    params: ReviewCommentRemove,
    handler: async (params, { runtime }) => {
      const surface = requireSurface()
      const worktreeId = await resolveWorktreeId(runtime, params.worktree)
      let removed = false
      const comments = await updatePendingReviewDrafts(surface.file(), worktreeId, (queue) => {
        removed = queue.some((comment) => comment.id === params.id)
        return removed ? removePendingReviewComment(queue, params.id) : queue
      })
      if (removed) {
        surface.announceChange({ worktreeId, comments })
      }
      return { removed }
    }
  }),
  defineMethod({
    name: 'reviewSummary.set',
    permission: 'workspace',
    params: ReviewSummarySet,
    handler: async (params, { runtime }) => {
      const surface = requireSurface()
      const worktreeId = await resolveWorktreeId(runtime, params.worktree)
      await writePendingReviewSummary(surface.file(), worktreeId, params.body)
      surface.announceChange({ worktreeId, summary: params.body })
      return { body: params.body }
    }
  })
]
