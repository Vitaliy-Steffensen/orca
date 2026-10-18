const WORKSPACE_PROMPT_INPUT_SELECTOR = '[data-workspace-prompt-input="true"]'
const WORKSPACE_NAME_INPUT_SELECTOR = '[data-workspace-name-input="true"]'
const WORKSPACE_SOURCE_PILL_SELECTOR = '[data-workspace-source-pill="true"]'
const PROJECT_COMBOBOX_TRIGGER_SELECTOR = '[data-project-combobox-root="true"][role="combobox"]'
const LEGACY_REPO_COMBOBOX_TRIGGER_SELECTOR = '[data-repo-combobox-root="true"][role="combobox"]'

export function getWorkspaceComposerInitialFocusTarget(root: ParentNode): HTMLElement | null {
  // Why: the quick-create dialog opens on the prompt so Enter creates at once.
  // The name field and source pill remain the fallback when that prompt is absent.
  const prompt = root.querySelector<HTMLElement>(WORKSPACE_PROMPT_INPUT_SELECTOR)
  const promptField = prompt?.querySelector<HTMLElement>('[contenteditable="true"]') ?? prompt
  return (
    promptField ??
    root.querySelector<HTMLElement>(WORKSPACE_NAME_INPUT_SELECTOR) ??
    root.querySelector<HTMLElement>(WORKSPACE_SOURCE_PILL_SELECTOR) ??
    root.querySelector<HTMLElement>(PROJECT_COMBOBOX_TRIGGER_SELECTOR) ??
    root.querySelector<HTMLElement>(LEGACY_REPO_COMBOBOX_TRIGGER_SELECTOR)
  )
}
