import type { HostedReviewInfo } from './hosted-review'
import type { PRInfo } from './github/pull-request-types'

export function hostedReviewInfoFromGitHubPRInfo(pr: PRInfo): HostedReviewInfo {
  return {
    provider: 'github',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    ...(pr.author ? { author: pr.author } : {}),
    status: pr.checksStatus,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.reviewDecision !== undefined ? { reviewDecision: pr.reviewDecision } : {}),
    ...(pr.autoMergeEnabled !== undefined ? { autoMergeEnabled: pr.autoMergeEnabled } : {}),
    ...(pr.autoMergeAllowed !== undefined ? { autoMergeAllowed: pr.autoMergeAllowed } : {}),
    ...(pr.mergeQueueRequired !== undefined ? { mergeQueueRequired: pr.mergeQueueRequired } : {}),
    ...(pr.mergeStateStatus !== undefined ? { mergeStateStatus: pr.mergeStateStatus } : {}),
    ...(pr.headSha ? { headSha: pr.headSha } : {}),
    ...(pr.prRepo ? { githubRepository: pr.prRepo } : {}),
    ...(pr.confirmedContainedHeadOid
      ? { confirmedContainedHeadOid: pr.confirmedContainedHeadOid }
      : {}),
    ...(pr.conflictSummary ? { conflictSummary: pr.conflictSummary } : {}),
    ...(pr.createdAt ? { createdAt: pr.createdAt } : {}),
    ...(typeof pr.additions === 'number' ? { additions: pr.additions } : {}),
    ...(typeof pr.deletions === 'number' ? { deletions: pr.deletions } : {}),
    ...(typeof pr.changedFiles === 'number' ? { changedFiles: pr.changedFiles } : {}),
    ...(pr.diffAreas ? { diffAreas: pr.diffAreas } : {}),
    ...(typeof pr.unresolvedComments === 'number'
      ? { unresolvedComments: pr.unresolvedComments }
      : {}),
    ...(pr.unresolvedCommentsTruncated ? { unresolvedCommentsTruncated: true } : {}),
    ...(pr.stack ? { stack: pr.stack } : {})
  }
}
