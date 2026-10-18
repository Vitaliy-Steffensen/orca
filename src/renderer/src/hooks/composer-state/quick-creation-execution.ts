import { workspaceAutonomyForMode, workspaceIntentForMode } from '../../../../shared/workspace-mode'
import type { WorkspaceMode } from '../../../../shared/workspace-mode'
import type { ComposerModel } from './composer-model'

type QuickCreationExecutionInput = Pick<
  ComposerModel,
  | 'clearNewWorkspaceDraft'
  | 'createMultiple'
  | 'effectivePresetId'
  | 'ephemeralVmRecipes'
  | 'ephemeralVmsEnabled'
  | 'isSubmissionCancelled'
  | 'agentPrompt'
  | 'linkedGitLabIssue'
  | 'linkedGitLabMR'
  | 'normalizedSparseDirectories'
  | 'onCreated'
  | 'parentWorktreeId'
  | 'persistDraft'
  | 'persistSetupAgentStartupPolicy'
  | 'prepareQuickSubmit'
  | 'resetForNextCreate'
  | 'resolvedInitialWorkspaceStatus'
  | 'selectedEphemeralVmRecipeId'
  | 'selectedRepoAgentLaunchFact'
  | 'selectedRepoExecutionHostId'
  | 'selectedRepoIsGit'
  | 'selectedRepoIsRemote'
  | 'selectedRepoTarget'
  | 'selectedRepoStartupShell'
  | 'selectedWorkspaceTarget'
  | 'settings'
  | 'sparseEnabled'
  | 'taskSourceContext'
  | 'telemetrySource'
>

import { useCallback } from 'react'
import type { TuiAgent } from '../../../../shared/tui-agent'
import type { WorktreeCreationRequest } from '@/lib/pending-worktree-creation'
import { useAppStore } from '@/store'
import { settleComposerSubmit } from '@/lib/composer-submit-cancellation'
import { runBackgroundWorktreeCreation } from '@/lib/worktree-creation-flow'
import { translate } from '@/i18n/i18n'
import { buildQuickComposerStartup } from './quick-startup-plan'
import { buildWrappedQuickCreationPrompts } from './quick-creation-prompt'
import { buildQuickCreationRequest } from './quick-creation-request'
import type { PendingSmartGitHubSubmitResolution } from './source-selection-decisions'
import { resolveAgentSessionLaunchRoute } from '@/lib/agent-session-launch-plan'

export function useQuickCreationExecution(input: QuickCreationExecutionInput) {
  const {
    clearNewWorkspaceDraft,
    createMultiple,
    effectivePresetId,
    ephemeralVmRecipes,
    ephemeralVmsEnabled,
    agentPrompt,
    isSubmissionCancelled,
    linkedGitLabIssue,
    linkedGitLabMR,
    normalizedSparseDirectories,
    onCreated,
    parentWorktreeId,
    persistDraft,
    persistSetupAgentStartupPolicy,
    prepareQuickSubmit,
    resetForNextCreate,
    resolvedInitialWorkspaceStatus,
    selectedEphemeralVmRecipeId,
    selectedRepoAgentLaunchFact,
    selectedRepoExecutionHostId,
    selectedRepoIsGit,
    selectedRepoIsRemote,
    selectedRepoTarget,
    selectedRepoStartupShell,
    selectedWorkspaceTarget,
    settings,
    sparseEnabled,
    taskSourceContext,
    telemetrySource
  } = input

  const executeQuickCreation = useCallback(
    async (
      smartGitHubResolution: PendingSmartGitHubSubmitResolution,
      requestedAgent: TuiAgent | null,
      workspaceNameSeed: string,
      workspaceRunContext: WorktreeCreationRequest['workspaceRunContext'],
      repoId: string,
      launchSeedOverlay?: Readonly<Record<string, string>>,
      workspaceMode?: WorkspaceMode
    ): Promise<void> => {
      const prepared = await prepareQuickSubmit(
        smartGitHubResolution,
        requestedAgent,
        workspaceNameSeed
      )

      if (!prepared) {
        return
      }

      const {
        submitLinkedWorkItem,
        agent,
        submitLinkedIssueNumber,
        submitLinkedPR,
        workspaceName,
        nameWasGenerated,
        nameIsAutoManaged,
        submitCompareBaseRef,
        submitPushTarget,
        effectiveSetupDecision,
        hookPreparation,
        linkedLinearIssue,
        linkedLinearIssueWorkspaceId,
        linkedLinearIssueOrganizationUrlKey,
        effectiveBranchNameOverride,
        submitBaseBranch,
        createDisplayName,
        pendingFirstAgentMessageRename,
        trimmedNote
      } = prepared

      const { quickPrompt, quickDraftPrompt } = buildWrappedQuickCreationPrompts({
        agent,
        agentPrompt,
        submitLinkedWorkItem,
        trimmedNote,
        nativeChatPromptMarks: settings?.nativeChatPromptMarks,
        workspaceMode
      })

      const {
        startupPlan,
        backendStartup,
        telemetry: quickTelemetry
      } = buildQuickComposerStartup({
        agent,
        prompt: quickPrompt,
        sessionOptions: launchSeedOverlay,
        draftPrompt: quickDraftPrompt,
        settings,
        launchHost: selectedRepoAgentLaunchFact,
        shell: selectedRepoStartupShell,
        isRemote: selectedRepoIsRemote,
        telemetrySource
      })

      const startupPolicySettlement = await settleComposerSubmit(
        persistSetupAgentStartupPolicy(),
        isSubmissionCancelled
      )

      if (startupPolicySettlement.status === 'cancelled') {
        return
      }

      if (!startupPolicySettlement.value) {
        throw new Error(
          translate(
            'auto.hooks.useComposerState.setupAgentStartupPolicySaveFailed',
            'Failed to save setup startup behavior.'
          )
        )
      }

      let ephemeralVmRecipe: WorktreeCreationRequest['ephemeralVmRecipe']

      const activeEphemeralVmRecipeId = ephemeralVmsEnabled ? selectedEphemeralVmRecipeId : null

      if (activeEphemeralVmRecipeId && selectedWorkspaceTarget.status === 'ready') {
        const selectedRecipe = ephemeralVmRecipes.find(
          (recipe) => recipe.id === activeEphemeralVmRecipeId
        )
        ephemeralVmRecipe = {
          sourceRepoId: repoId,
          recipeId: activeEphemeralVmRecipeId,
          projectId: selectedWorkspaceTarget.target.projectId,
          ...(selectedRecipe?.checkoutMode ? { checkoutMode: selectedRecipe.checkoutMode } : {})
        }
      }

      const promptDelivery = quickDraftPrompt ? 'draft' : 'auto-submit'
      // Why: the verdict is persisted on the request as data and re-entered once the worktree exists.
      const agentLaunchRoute = agent
        ? resolveAgentSessionLaunchRoute(useAppStore.getState(), {
            agent,
            workspace: {
              kind: selectedRepoIsGit ? 'git-worktree' : 'folder',
              repoId,
              executionHostId: ephemeralVmRecipe
                ? 'runtime:pending-ephemeral-vm'
                : (workspaceRunContext?.hostId ?? selectedRepoExecutionHostId ?? undefined)
            },
            prompt: quickDraftPrompt ?? quickPrompt,
            promptDelivery
          })
        : 'terminal-tui'
      const structuredLaunch = agentLaunchRoute === 'structured-native-chat'

      const request = buildQuickCreationRequest({
        repoId,
        ephemeralVmRecipe,
        indeterminateProgress:
          Boolean(activeEphemeralVmRecipeId) || selectedRepoTarget?.kind === 'environment',
        taskSourceContext,
        linkedWorkItem: submitLinkedWorkItem,
        workspaceRunContext,
        workspaceName,
        nameWasGenerated,
        displayName: createDisplayName,
        displayNameKind: createDisplayName ? (nameIsAutoManaged ? 'generated' : 'user') : undefined,
        selectedRepoIsGit,
        baseBranch: submitBaseBranch,
        compareBaseRef: submitCompareBaseRef,
        setupDecision: effectiveSetupDecision,
        sparseDirectories: selectedRepoIsGit && sparseEnabled ? normalizedSparseDirectories : null,
        sparsePresetId: effectivePresetId,
        telemetrySource,
        linkedIssue: submitLinkedIssueNumber,
        linkedPR: submitLinkedPR,
        pushTarget: submitPushTarget,
        agent,
        agentLaunchRoute,
        linkedLinearIssue,
        linkedLinearIssueWorkspaceId,
        linkedLinearIssueOrganizationUrlKey,
        branchNameOverride: effectiveBranchNameOverride,
        parentWorktreeId,
        workspaceStatus: resolvedInitialWorkspaceStatus,
        ...(workspaceMode
          ? {
              workspaceAutonomy: workspaceAutonomyForMode(workspaceMode),
              workspaceIntent: workspaceIntentForMode(workspaceMode)
            }
          : {}),
        linkedGitLabMR,
        linkedGitLabIssue,
        includeGitLabLinks: smartGitHubResolution.kind === 'none',
        startup: structuredLaunch ? undefined : backendStartup,
        hookPreparation: ephemeralVmRecipe
          ? {
              ...hookPreparation,
              executionHostId: selectedRepoExecutionHostId ?? undefined,
              confirmVmRecipe: true
            }
          : hookPreparation,
        pendingFirstAgentMessageRename,
        note: trimmedNote,
        startupPlan,
        quickPrompt,
        launchDraftPrompt: quickDraftPrompt,
        promptDelivery,
        quickTelemetry,
        suppressTerminalFocusOnCompletion: createMultiple,
        ...(launchSeedOverlay ? { launchSeedOverlay } : {})
      })

      if (isSubmissionCancelled()) {
        return
      }

      if (persistDraft) {
        clearNewWorkspaceDraft()
      }

      runBackgroundWorktreeCreation(request)

      if (createMultiple) {
        resetForNextCreate()
      } else {
        onCreated?.()
      }
    },
    [
      agentPrompt,
      clearNewWorkspaceDraft,
      createMultiple,
      effectivePresetId,
      ephemeralVmRecipes,
      ephemeralVmsEnabled,
      isSubmissionCancelled,
      linkedGitLabIssue,
      linkedGitLabMR,
      normalizedSparseDirectories,
      onCreated,
      parentWorktreeId,
      persistDraft,
      persistSetupAgentStartupPolicy,
      prepareQuickSubmit,
      resetForNextCreate,
      resolvedInitialWorkspaceStatus,
      selectedEphemeralVmRecipeId,
      selectedRepoAgentLaunchFact,
      selectedRepoExecutionHostId,
      selectedRepoIsGit,
      selectedRepoIsRemote,
      selectedRepoTarget,
      selectedRepoStartupShell,
      selectedWorkspaceTarget,
      settings,
      sparseEnabled,
      taskSourceContext,
      telemetrySource
    ]
  )

  return {
    executeQuickCreation
  }
}
