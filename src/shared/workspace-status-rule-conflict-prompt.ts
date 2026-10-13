import { buildResolvePullRequestConflictsPrompt } from './source-control-conflict-prompts'
import {
  renderWorkspaceStatusRulePrompt,
  type WorkspaceStatusRulePromptVariable
} from './workspace-status-rule-prompt'

const PUSH_RULE =
  '- Once the merge commit exists and validation passes, push the branch with a plain git push. Never force-push; if the push is rejected, stop and report why.'

export function buildConflictAgentPrompt(input: { baseRef: string; worktreePath: string }): string {
  const prompt = buildResolvePullRequestConflictsPrompt({
    baseRef: input.baseRef,
    entries: [],
    worktreePath: input.worktreePath
  })
  const lines = prompt.split('\n')
  const noPush = lines.findIndex((line) => line.startsWith('- Do not push'))
  // Why replace rather than append: the stock rule forbids pushing, and a later rule contradicting it leaves the agent to pick one.
  if (noPush === -1) {
    const reply = lines.findIndex((line) => line.startsWith('Reply with'))
    lines.splice(reply === -1 ? lines.length : reply - 1, 0, PUSH_RULE)
  } else {
    lines[noPush] = PUSH_RULE
  }
  return lines.join('\n')
}

const BASE_REF_TOKEN = 'ORCABASEREFTOKEN'
const WORKTREE_PATH_TOKEN = 'ORCAWORKTREEPATHTOKEN'

/** The built-in prompt with its variables left as placeholders, for the settings box to start from. */
// Why plain tokens first: the builder words its fetch and merge steps for a simple ref, and
// "{{baseRef}}" is not one, so building with it directly gave the other wording.
export const DEFAULT_CONFLICT_PROMPT_TEMPLATE = buildConflictAgentPrompt({
  baseRef: BASE_REF_TOKEN,
  worktreePath: WORKTREE_PATH_TOKEN
})
  .replaceAll(BASE_REF_TOKEN, '{{baseRef}}')
  .replaceAll(WORKTREE_PATH_TOKEN, '{{worktreePath}}')

// Fork: an empty template keeps the built-in prompt, so upstream's wording still reaches it.
export function renderConflictAgentPrompt(
  template: string,
  variables: Partial<Record<WorkspaceStatusRulePromptVariable, string>> & {
    baseRef: string
    worktreePath: string
  }
): string {
  if (!template.trim()) {
    return buildConflictAgentPrompt(variables)
  }
  return renderWorkspaceStatusRulePrompt(template, variables)
}
