import { forgeOwnerHostIdForWorkspace } from '@/runtime/forge-credential-target'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { buildPRCommentsResolutionPrompt } from '../../pr-comments-resolution-prompt'
import { parseGitHubIssueOrPRLink } from '../../../../../shared/github/links'
import { setPendingPRCommentAiAck } from '../pr-comments-ai-launch-ack'
import type { PendingPRCommentAiAckGithubTarget } from '../pr-comments-ai-launch-ack'
import type { PRCommentGroup } from '../../../../../shared/pr-comment-groups'
import { translate } from '@/i18n/i18n'

import type { ChecksPanelContextState } from './use-checks-panel-context-state'
import type { ChecksPanelControllerState } from './use-checks-panel-controller-state'
import type { ChecksPanelCommentResolutionState } from './use-checks-panel-comment-resolution'
import type { ChecksPanelReviewState } from './use-checks-panel-review-state'
import type { ChecksPanelComposerState } from './use-checks-panel-composer-state'

type ChecksPanelAiQueueInput = Pick<ChecksPanelContextState, 'activeReview' | 'pr' | 'prNumber'> &
  Pick<
    ChecksPanelControllerState,
    | 'activeWorktree'
    | 'activeWorktreeId'
    | 'activeWorktreePath'
    | 'claimedCommentResolutionRef'
    | 'commentResolutionAckBusyRef'
    | 'commentResolutionLaunchAcceptedRef'
    | 'pendingCommentResolutionRef'
    | 'repo'
    | 'setAgentComposerState'
  > &
  Pick<ChecksPanelCommentResolutionState, 'resolveCommentsWithAIDisabledReason'> &
  Pick<ChecksPanelReviewState, 'sourceControlAiActionsVisible'> &
  Pick<ChecksPanelComposerState, 'stateRequestKey'>

export function useChecksPanelAiQueue(model: ChecksPanelAiQueueInput) {
  const {
    activeReview,
    activeWorktree,
    activeWorktreeId,
    activeWorktreePath,
    claimedCommentResolutionRef,
    commentResolutionAckBusyRef,
    commentResolutionLaunchAcceptedRef,
    pendingCommentResolutionRef,
    pr,
    prNumber,
    repo,
    resolveCommentsWithAIDisabledReason,
    setAgentComposerState,
    sourceControlAiActionsVisible,
    stateRequestKey
  } = model
  const handleResolveCommentsWithAI = useCallback(
    (selectedGroups: PRCommentGroup[]): void => {
      if (
        !sourceControlAiActionsVisible ||
        !activeWorktreeId ||
        !activeReview ||
        !repo ||
        resolveCommentsWithAIDisabledReason
      ) {
        return
      }
      // Why: re-entering while a launch/ack is still landing would post a second
      // fixing reply on the same threads.
      if (commentResolutionAckBusyRef.current) {
        return
      }
      if (selectedGroups.length === 0) {
        toast.message(
          translate(
            'auto.components.right.sidebar.ChecksPanel.f316a8ca2b',
            'No unresolved comments selected.'
          )
        )
        return
      }
      // Why: pr.prRepo can be missing while comments are still visible; fall back to the PR URL.
      const githubTargetFromPr =
        activeReview.provider === 'github' && prNumber && pr?.prRepo
          ? {
              repoPath: repo.path,
              repoId: repo.id,
              prNumber,
              prRepo: pr.prRepo
            }
          : undefined
      const githubTargetFromUrl = ((): PendingPRCommentAiAckGithubTarget | undefined => {
        if (activeReview.provider !== 'github' || githubTargetFromPr) {
          return undefined
        }
        const link = parseGitHubIssueOrPRLink(activeReview.url || pr?.url || '')
        if (!link || link.type !== 'pr') {
          return undefined
        }
        return {
          repoPath: repo.path,
          repoId: repo.id,
          prNumber: link.number,
          prRepo: {
            owner: link.slug.owner,
            repo: link.slug.repo,
            host: link.slug.host
          }
        }
      })()
      const githubTarget = githubTargetFromPr ?? githubTargetFromUrl
      // Why: resolving needs no prRepo, so a degraded PR entry that only yields a number must
      // still ack by resolving instead of failing every selected thread.
      const githubResolveTarget =
        githubTarget ??
        (activeReview.provider === 'github' && prNumber
          ? { repoPath: repo.path, repoId: repo.id, prNumber }
          : undefined)
      // Why: the ack resolves against this MR after delivery, so pin the iid now — the panel
      // may already be showing a different review by then.
      const gitlabTarget =
        activeReview.provider === 'gitlab'
          ? {
              repoPath: repo.path,
              repoId: repo.id,
              iid: activeReview.number,
              ownerHostId: forgeOwnerHostIdForWorkspace(repo, activeWorktree)
            }
          : undefined
      const commentResolution = {
        reviewContextKey: stateRequestKey,
        provider: activeReview.provider,
        selectedGroups,
        githubTarget,
        githubResolveTarget,
        gitlabTarget
      }
      claimedCommentResolutionRef.current = null
      commentResolutionLaunchAcceptedRef.current = false
      setAgentComposerState({
        actionId: 'resolveComments',
        title: translate(
          'auto.components.right.sidebar.ChecksPanel.d00ebdc402',
          'Resolve {{value0}} Comments With AI',
          { value0: activeReview.provider === 'gitlab' ? 'MR' : 'PR' }
        ),
        // Why: only GitHub with a resolved PR target posts fixing replies; other providers
        // must not be promised a reply the ack never sends. Resolvable threads are acked by
        // resolving alone, so the copy leads with that.
        description:
          githubTarget && activeReview.provider === 'github'
            ? translate(
                'auto.components.right.sidebar.ChecksPanel.5eb2163b6b',
                'Review the prompt before starting an agent. After the prompt is delivered, Orca resolves the selected host threads and replies to comments it cannot resolve.'
              )
            : translate(
                'auto.components.right.sidebar.ChecksPanel.abf59262fb',
                'Review and edit the full command input before starting an agent.'
              ),
        prompt: buildPRCommentsResolutionPrompt({
          reviewKind: activeReview.provider === 'gitlab' ? 'MR' : 'PR',
          reviewNumber: activeReview.number,
          reviewTitle: activeReview.title,
          reviewUrl: activeReview.url,
          groups: selectedGroups,
          worktreePath: activeWorktreePath
        }),
        launchSource: 'task_page',
        commentResolution
      })
      pendingCommentResolutionRef.current = commentResolution
      // Why: module-level store survives dialog close / re-render races that clear the ref.
      setPendingPRCommentAiAck(commentResolution)
    },
    [
      activeReview,
      activeWorktree,
      activeWorktreeId,
      activeWorktreePath,
      pr?.prRepo,
      pr?.url,
      prNumber,
      repo,
      resolveCommentsWithAIDisabledReason,
      sourceControlAiActionsVisible,
      stateRequestKey,
      setAgentComposerState,
      pendingCommentResolutionRef,
      commentResolutionAckBusyRef,
      claimedCommentResolutionRef,
      commentResolutionLaunchAcceptedRef
    ]
  )
  return { handleResolveCommentsWithAI }
}

export type ChecksPanelAiQueueState = ReturnType<typeof useChecksPanelAiQueue>
