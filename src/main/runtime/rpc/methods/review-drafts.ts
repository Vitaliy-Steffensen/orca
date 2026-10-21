import { randomUUID } from 'node:crypto'
import {
  addPendingReviewComment,
  proposedPendingReviewComments,
  removePendingReviewComment,
  type PendingReviewComment
} from '../../../../shared/github/pending-review-comment'
import {
  ReviewAssetUpload,
  ReviewCommentAdd,
  ReviewCommentList,
  ReviewCommentRemove,
  ReviewSummaryGet,
  ReviewSummarySet
} from '../../../../shared/rpc-contract/review-draft-params'
import {
  readPendingReviewDrafts,
  readPendingReviewSummaries,
  updatePendingReviewDrafts,
  writePendingReviewSummary
} from '../../../github/pending-review-draft-store'
import { getOwnerRepo } from '../../../github/github-owner-repo-selection'
import { uploadReviewAsset } from '../../../github/review-asset-upload'
import {
  getPendingReviewDraftSurface,
  type PendingReviewDraftSurface
} from '../../../github/pending-review-draft-surface'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { defineMethod } from '../core'
import { NO_REVIEW_SURFACE } from '../../../../shared/no-review-surface'

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

/**
 * The GitHub owner/repo behind a workspace.
 *
 * Why it is resolved from the repo record rather than the caller: the renderer reads this from
 * client state the main process cannot see, and an attachment belongs to the repository the
 * workspace came from, whichever host runs the CLI.
 */
async function resolveWorktreeOwnerRepo(
  runtime: OrcaRuntimeService,
  selector: string
): Promise<{ owner: string; repo: string }> {
  const worktree = await runtime.showManagedWorktree(selector)
  const repo = runtime.listRepos().find((candidate) => candidate.id === worktree.repoId)
  if (!repo) {
    throw new Error('This workspace has no repository on this host.')
  }
  const ownerRepo = await getOwnerRepo(repo.path, repo.connectionId)
  if (!ownerRepo) {
    throw new Error(
      'This workspace has no GitHub remote, so files cannot be attached. Keep screenshots in your reply instead.'
    )
  }
  return ownerRepo
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
        agentAuthor: { kind: 'agent', name: params.agent },
        status: 'proposed'
      }
      const comments = await updatePendingReviewDrafts(surface.file(), worktreeId, (queue) =>
        addPendingReviewComment(queue, comment)
      )
      surface.announceChange({ worktreeId, comments })
      return {
        comment,
        pendingCount: proposedPendingReviewComments(comments).length
      }
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
  }),
  defineMethod({
    name: 'reviewSummary.get',
    permission: 'workspace',
    params: ReviewSummaryGet,
    handler: async (params, { runtime }) => {
      const surface = requireSurface()
      const worktreeId = await resolveWorktreeId(runtime, params.worktree)
      const summaries = await readPendingReviewSummaries(surface.file())
      return { body: summaries[worktreeId] ?? '' }
    }
  }),
  defineMethod({
    name: 'reviewAsset.upload',
    permission: 'workspace',
    params: ReviewAssetUpload,
    // Why no requireSurface(): an upload needs a GitHub token and a repository, not a review shelf,
    // so gating it would refuse on exactly the headless hosts where it still works.
    handler: async (params, { runtime }) => {
      const repo = await resolveWorktreeOwnerRepo(runtime, params.worktree)
      const result = await uploadReviewAsset({
        name: params.name,
        contentType: params.contentType,
        bytes: Buffer.from(params.base64, 'base64'),
        repo
      })
      if (!result.ok) {
        throw new Error(result.error)
      }
      return { url: result.url, kind: result.kind }
    }
  })
]
