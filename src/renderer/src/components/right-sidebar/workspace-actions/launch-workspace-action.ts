import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { launchAgentBackgroundSession } from '@/lib/launch-agent-background-session'
import { focusTerminalTabSurface } from '@/lib/focus-terminal-tab-surface'
import { translate } from '@/i18n/i18n'
import {
  buildResolveConflictsPrompt,
  buildResolvePullRequestConflictsPrompt
} from '../../../../../shared/source-control-conflict-prompts'
import {
  renderSourceControlActionCommandTemplate,
  DEFAULT_SOURCE_CONTROL_ACTION_COMMAND_TEMPLATES
} from '../../../../../shared/source-control-ai-actions'
import {
  resolveSourceControlActionRecipe,
  resolveSourceControlAiInstructions,
  resolveSourceControlAiPrCreationDefaults
} from '../../../../../shared/source-control-ai'
import {
  REVIEW_REGROUP_PROMPT,
  renderWorkspaceActionPrompt,
  resolveWorkspaceActionPromptTemplate,
  type WorkspaceActionPromptId
} from '../../../../../shared/workspace-action-prompts'
import type { WorkspaceActionKind } from '../../../../../shared/workspace-action'
import {
  selectWorkspaceActionContext,
  type WorkspaceActionContext
} from './workspace-action-context'

// Why wider than the action kinds: regrouping a review plan is launched from the Review plan tab,
// not from the header's list of next steps.
export type WorkspaceActionLaunch = WorkspaceActionKind | 'regroup'

const PROMPT_BY_ACTION: Record<
  Exclude<WorkspaceActionKind, 'resolve-conflicts'>,
  WorkspaceActionPromptId
> = {
  'commit-and-push': 'commitAndPush',
  'ready-for-review': 'readyForReview',
  'create-pull-request': 'createPullRequest',
  'create-draft-pull-request': 'createPullRequest',
  review: 'reviewPipeline',
  're-review': 'reReviewPullRequest'
}

function buildConflictPrompt(context: WorkspaceActionContext): string {
  const state = useAppStore.getState()
  const basePrompt =
    context.unresolvedConflicts.length > 0
      ? buildResolveConflictsPrompt({
          conflictOperation: state.gitConflictOperationByWorktree[context.worktree.id] ?? 'unknown',
          entries: context.unresolvedConflicts,
          worktreePath: context.worktree.path
        })
      : buildResolvePullRequestConflictsPrompt({
          baseRef: context.pr?.conflictSummary?.baseRef ?? context.pr?.baseRefName,
          entries: (context.pr?.conflictSummary?.files ?? []).map((path) => ({ path })),
          worktreePath: context.worktree.path
        })
  // Why the conflict recipe: it is the template Source Control already offers for this job.
  const recipe = resolveSourceControlActionRecipe({
    settings: state.settings,
    repo: context.repo,
    actionId: 'resolveConflicts'
  })
  return renderSourceControlActionCommandTemplate(
    recipe.commandInputTemplate ?? DEFAULT_SOURCE_CONTROL_ACTION_COMMAND_TEMPLATES.resolveConflicts,
    { basePrompt }
  ).trim()
}

function buildTemplatePrompt(
  context: WorkspaceActionContext,
  id: WorkspaceActionPromptId,
  // Why an override: the Create PR split button lets you pick draft per pull request, which has to
  // win over the repo's configured default rather than silently agree with it.
  draftOverride?: boolean,
  // Why a literal: the regroup prompt is a fixed internal step, not one of the user's editable prompts.
  templateOverride?: string
): string {
  const state = useAppStore.getState()
  const settings = state.settings
  const prDefaults = settings
    ? resolveSourceControlAiPrCreationDefaults({ settings, repo: context.repo })
    : null
  const prInstructions = settings
    ? resolveSourceControlAiInstructions({
        settings,
        repo: context.repo,
        operation: 'pullRequest'
      })
    : ''
  const baseRef =
    context.pr?.baseRefName ?? context.worktree.baseRef?.replace(/^origin\//, '') ?? 'main'
  return renderWorkspaceActionPrompt(
    templateOverride ??
      resolveWorkspaceActionPromptTemplate(state.workspaceStatusRules.actionPrompts, id),
    {
      branch: context.branch,
      baseRef,
      worktreePath: context.worktree.path,
      prNumber: context.pr ? String(context.pr.number) : '',
      prUrl: context.pr?.url ?? '',
      prTitle: context.pr?.title ?? '',
      draftMode:
        (draftOverride ?? prDefaults?.draft) ? 'as a draft' : 'ready for review (not a draft)',
      templateRule: prDefaults?.useTemplate
        ? "Fill in the repository's pull request template if it has one."
        : 'Do not use a pull request template.',
      prInstructions: prInstructions
        ? `\nFollow these instructions for the pull request:\n${prInstructions}`
        : ''
    }
  )
}

function actionTitle(kind: WorkspaceActionLaunch, context: WorkspaceActionContext): string {
  switch (kind) {
    case 'regroup':
      return translate('auto.components.workspaceActions.regroupTab', 'Group {{branch}}', {
        branch: context.branch
      })
    case 'review':
      return translate('auto.components.workspaceActions.reviewTab', 'Review {{branch}}', {
        branch: context.branch
      })
    case 're-review':
      return translate('auto.components.workspaceActions.reReviewTab', 'Re-review #{{number}}', {
        number: context.pr?.number ?? ''
      })
    case 'commit-and-push':
      return translate('auto.components.workspaceActions.commitTab', 'Commit & push')
    case 'resolve-conflicts':
      return translate('auto.components.workspaceActions.conflictsTab', 'Resolve conflicts')
    case 'ready-for-review':
      return translate('auto.components.workspaceActions.readyTab', 'Ready for review')
    case 'create-draft-pull-request':
      return translate('auto.components.workspaceActions.createDraftPrTab', 'Create draft PR')
    case 'create-pull-request':
      return translate('auto.components.workspaceActions.createPrTab', 'Create PR')
  }
}

export async function launchWorkspaceAction(kind: WorkspaceActionLaunch): Promise<void> {
  const state = useAppStore.getState()
  const context = selectWorkspaceActionContext(state)
  if (!context) {
    return
  }
  // Why re-check: the menu is rendered from a snapshot, and a status tick between opening it and
  // clicking can retract the action under the pointer. Review and regroup run on the branch, so
  // they answer to the branch rather than to the list of next steps.
  const reviewsBranch = kind === 'review' || kind === 'regroup'
  if (reviewsBranch ? !context.canReviewBranch : !context.actions.includes(kind)) {
    return
  }
  const prompt =
    kind === 'regroup'
      ? buildTemplatePrompt(context, 'reviewPipeline', undefined, REVIEW_REGROUP_PROMPT)
      : kind === 'resolve-conflicts'
        ? buildConflictPrompt(context)
        : buildTemplatePrompt(
            context,
            PROMPT_BY_ACTION[kind],
            kind === 'create-draft-pull-request' ? true : undefined
          )
  const actionAgent = reviewsBranch ? state.workspaceStatusRules.actionAgents.reviewPipeline : null
  try {
    const launched = await launchAgentBackgroundSession({
      agent: actionAgent?.agent ?? state.workspaceStatusRules.reviewInbox.agent,
      ...(actionAgent?.model
        ? {
            sessionOptions: {
              model: actionAgent.model,
              ...(actionAgent.effort ? { effort: actionAgent.effort } : {})
            }
          }
        : {}),
      worktreeId: context.worktree.id,
      prompt,
      launchSource: 'unknown',
      title: actionTitle(kind, context)
    })
    if (launched) {
      const store = useAppStore.getState()
      store.setActiveTab(launched.tabId)
      store.setActiveTabType('terminal', context.worktree.id)
      focusTerminalTabSurface(launched.tabId)
    }
  } catch (error) {
    toast.error(
      translate(
        'auto.components.workspaceActions.launchFailed',
        'Could not start the agent: {{reason}}',
        {
          reason: error instanceof Error ? error.message : String(error)
        }
      )
    )
  }
}
