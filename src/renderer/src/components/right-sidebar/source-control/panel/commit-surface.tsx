import { CreateHostedReviewComposer } from '../../CreateHostedReviewComposer'
import type { SourceControlPanelReadyProps } from './panel-props'

type SourceControlCommitSurfaceProps = SourceControlPanelReadyProps & {
  showGenericEmptyState: boolean
}

/**
 * The action surface below the file list: the review composer when Create review is the direct
 * next step. Fork: upstream's commit box is gone — committing is left to the agent or the CLI.
 */
export function SourceControlCommitSurface({
  activeRepo,
  model,
  worktreePath
}: SourceControlCommitSurfaceProps) {
  const {
    activeWorktreeId,
    branchName,
    createPrIntentNotice,
    directCreatePrAction,
    dropdownItems,
    handleActionInvoke,
    handleCancelGeneratePullRequestFields,
    handleCreatePullRequest,
    handleGeneratePullRequestFieldsClick,
    hostedReviewCreateProvider,
    isCreatingPr,
    prAiGenerationEnabled,
    prBase,
    prBaseQuery,
    prBaseResults,
    prBaseSearchError,
    prBaseSearchPending,
    prBody,
    prDraft,
    prGenerateDisabled,
    prGenerateDisabledReason,
    prGenerateError,
    prGenerating,
    prRepoDefaultBaseRef,
    prStackedCreationSupported,
    prTitle,
    setPrBase,
    setPrBaseQuery,
    setPrBaseResults,
    setPrBody,
    setPrDraft,
    setPrTitle,
    sourceControlAiActionsVisible,
    stackParentReview
  } = model

  if (!directCreatePrAction) {
    return null
  }

  return (
    <CreateHostedReviewComposer
      key={`${activeRepo.id}:${activeWorktreeId ?? worktreePath}:${branchName}`}
      provider={hostedReviewCreateProvider}
      branch={branchName}
      base={prBase}
      repoDefaultBase={prRepoDefaultBaseRef}
      setBase={setPrBase}
      title={prTitle}
      setTitle={setPrTitle}
      body={prBody}
      setBody={setPrBody}
      draft={prDraft}
      setDraft={setPrDraft}
      stackedCreationSupported={prStackedCreationSupported}
      stackParentReview={stackParentReview}
      baseQuery={prBaseQuery}
      setBaseQuery={setPrBaseQuery}
      baseResults={prBaseResults}
      setBaseResults={setPrBaseResults}
      baseSearchPending={prBaseSearchPending}
      baseSearchError={prBaseSearchError}
      aiGenerationEnabled={sourceControlAiActionsVisible && prAiGenerationEnabled}
      generating={prGenerating}
      generateDisabled={prGenerateDisabled}
      generateDisabledReason={prGenerateDisabledReason}
      generateError={prGenerateError}
      createError={
        createPrIntentNotice?.tone === 'destructive' ? createPrIntentNotice.message : null
      }
      isCreating={isCreatingPr}
      primaryAction={directCreatePrAction}
      dropdownItems={dropdownItems}
      onGenerate={handleGeneratePullRequestFieldsClick}
      onCancelGenerate={handleCancelGeneratePullRequestFields}
      onPrimaryAction={(stacked) => {
        void handleCreatePullRequest(stacked)
      }}
      onDropdownAction={handleActionInvoke}
    />
  )
}
