import type { PRRefreshOutcome } from '../../../../shared/github/pull-request-refresh-types'
import type {
  PRConflictSummary,
  PRMergeableState,
  GitHubPRStack
} from '../../../../shared/github/pull-request-types'
import { deriveCheckStatus, mapPRState } from '../../mappers'
import type { OwnerRepo } from '../../gh-utils'
import { pullRequestAuthorLogin, type PullRequestLookupData } from './pull-request-lookup-data'

export function assemblePRRefreshFoundOutcome(args: {
  data: PullRequestLookupData
  dataRepo: OwnerRepo | null
  dataHeadRepo: OwnerRepo | null
  stack: GitHubPRStack | undefined
  mergeable: PRMergeableState
  stackMergeQueueRequired: boolean | null | undefined
  confirmedContainedHeadOid: string | null
  headDivergedFromMergedPRAtOid: string | null
  conflictSummary: PRConflictSummary | undefined
}): PRRefreshOutcome {
  const {
    data,
    dataRepo,
    dataHeadRepo,
    stack,
    mergeable,
    stackMergeQueueRequired,
    confirmedContainedHeadOid,
    headDivergedFromMergedPRAtOid,
    conflictSummary
  } = args
  const author = pullRequestAuthorLogin(data)
  return {
    kind: 'found',
    fetchedAt: Date.now(),
    pr: {
      number: data.number,
      title: data.title,
      state: mapPRState(data.state, data.isDraft),
      url: data.url,
      ...(author ? { author } : {}),
      checksStatus: deriveCheckStatus(data.statusCheckRollup),
      updatedAt: data.updatedAt,
      mergeable,
      ...(data.reviewDecision !== undefined ? { reviewDecision: data.reviewDecision } : {}),
      ...(data.autoMergeEnabled !== undefined ? { autoMergeEnabled: data.autoMergeEnabled } : {}),
      ...(data.autoMergeAllowed !== undefined ? { autoMergeAllowed: data.autoMergeAllowed } : {}),
      ...(stackMergeQueueRequired !== undefined || data.mergeQueueRequired !== undefined
        ? {
            mergeQueueRequired:
              stackMergeQueueRequired !== undefined
                ? stackMergeQueueRequired
                : data.mergeQueueRequired
          }
        : {}),
      ...(data.mergeMethodSettings !== undefined
        ? { mergeMethodSettings: data.mergeMethodSettings }
        : {}),
      ...(data.mergeStateStatus !== undefined ? { mergeStateStatus: data.mergeStateStatus } : {}),
      ...(stack ? { stack } : {}),
      headSha: data.headRefOid,
      ...(confirmedContainedHeadOid ? { confirmedContainedHeadOid } : {}),
      ...(headDivergedFromMergedPRAtOid ? { headDivergedFromMergedPRAtOid } : {}),
      ...(data.baseRefName ? { baseRefName: data.baseRefName } : {}),
      ...(data.headRefName ? { headRefName: data.headRefName } : {}),
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      ...(typeof data.additions === 'number' ? { additions: data.additions } : {}),
      ...(typeof data.deletions === 'number' ? { deletions: data.deletions } : {}),
      ...(typeof data.changedFiles === 'number' ? { changedFiles: data.changedFiles } : {}),
      ...(data.diffAreas ? { diffAreas: data.diffAreas } : {}),
      ...(typeof data.unresolvedComments === 'number'
        ? { unresolvedComments: data.unresolvedComments }
        : {}),
      ...(data.unresolvedCommentsTruncated ? { unresolvedCommentsTruncated: true } : {}),
      prRepo: dataRepo ?? undefined,
      headRepo: dataHeadRepo ?? undefined,
      conflictSummary
    }
  }
}
