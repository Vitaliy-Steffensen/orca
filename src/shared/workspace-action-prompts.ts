import { REVIEW_STAGED_COMMENT_INSTRUCTION } from './agent-note-prompt'

// Why split: these are the prompts behind the workspace top bar's own buttons, while
// `reviewPipeline` is configured on its own Settings pane and launched from elsewhere.
export const TOP_BAR_WORKSPACE_ACTION_PROMPT_IDS = [
  'commitAndPush',
  'createPullRequest',
  'readyForReview',
  'reviewPullRequest',
  'reReviewPullRequest'
] as const

export const WORKSPACE_ACTION_PROMPT_IDS = [
  ...TOP_BAR_WORKSPACE_ACTION_PROMPT_IDS,
  'reviewPipeline'
] as const

export type WorkspaceActionPromptId = (typeof WORKSPACE_ACTION_PROMPT_IDS)[number]

export const WORKSPACE_ACTION_PROMPT_VARIABLES = [
  'branch',
  'baseRef',
  'worktreePath',
  'prNumber',
  'prUrl',
  'prTitle',
  'draftMode',
  'prInstructions',
  'templateRule'
] as const

export type WorkspaceActionPromptVariable = (typeof WORKSPACE_ACTION_PROMPT_VARIABLES)[number]

export const DEFAULT_WORKSPACE_ACTION_PROMPTS: Record<WorkspaceActionPromptId, string> = {
  commitAndPush: `Commit and push the work in this worktree ({{worktreePath}}, branch {{branch}}).

- Start with git status and git diff to see what changed.
- Group the changes into focused commits with clear messages that follow the repository's conventions.
- Do not commit secrets, build output or unrelated files; stop and ask if something looks accidental.
- Push the branch, setting the upstream if it has none. Never force-push; if the push is rejected, stop and report why.

Reply with the commits you made and the result of the push.`,
  createPullRequest: `Open a pull request for branch {{branch}} in {{worktreePath}}, targeting {{baseRef}}.

- First commit and push all the work: start with git status and git diff, group the changes into focused commits with clear messages that follow the repository's conventions, and push the branch (never force), setting its upstream if it has none.
- Write the title and description from the commits and the diff against {{baseRef}}.
- {{templateRule}}
- Create it {{draftMode}} with gh pr create.
{{prInstructions}}

Reply with the pull request URL.`,
  readyForReview: `Get pull request #{{prNumber}} ({{prUrl}}) ready for review and mark it ready.

- Check that the branch is pushed and the checks are passing; fix anything small that is failing, and stop and report anything that is not.
- Make sure the title and description still match what the branch now does, and update them if they do not.
- Then mark it ready with gh pr ready {{prNumber}}.

Reply with what you checked, anything you changed, and the final state.`,
  reviewPullRequest: `Review pull request #{{prNumber}} — "{{prTitle}}" ({{prUrl}}).
The branch {{branch}} is checked out in {{worktreePath}}; compare it against {{baseRef}}.

- If you have the review-pr skill, use it: it picks the passes this diff needs, checks the UI in the browser when one changed, and handles the staging below. Otherwise follow the rest of this prompt.
- Read the full diff and the surrounding code it touches.
- Point out bugs, missing edge cases, risky changes and anything that does not fit how the codebase already does things.
- Order findings by severity, each with the file and line and a concrete suggestion.
- Do not change any code.

${REVIEW_STAGED_COMMENT_INSTRUCTION}`,
  reReviewPullRequest: `Re-review pull request #{{prNumber}} — "{{prTitle}}" ({{prUrl}}).
The branch {{branch}} is checked out in {{worktreePath}}; its base is {{baseRef}}.

- If you have the re-review skill, use it. Otherwise follow the rest of this prompt.
- Find the review I already left on this pull request — inline comments, review summaries and conversation comments — and the commit I left it on. Diff from there, not from the base.
- For each point I made, say how it was answered: done as asked, done differently, covered by a follow-up task, argued against with a reason that holds, argued against with a reason that does not, or not addressed at all. Quote the code that settles it.
- Then flag anything new that arrived in those commits and was not part of what I asked for.
- Do not change any code.

${REVIEW_STAGED_COMMENT_INSTRUCTION}`,
  reviewPipeline: `Review the work on branch {{branch}} in {{worktreePath}} against {{baseRef}}.

- Use the orca-review skill: it rates and groups the changed files, delegates to whatever review rulebooks this repository ships, screenshots the UI when the frontend diff earns it, and stages the findings. Otherwise follow the rest of this prompt.
- Read every changed file, not only the diff hunks, and say which ones are worth reading first.
- Run every review skill you have whose area the diff touches, such as review-fe for frontend changes and review-be for backend changes, in parallel, and treat their rules as the authority on what is a defect.
- Only report a finding you can tie to the input or state that makes it go wrong, and only when this branch caused it or made it worse.
- Do not change any code.

${REVIEW_STAGED_COMMENT_INSTRUCTION}`
}

export function resolveWorkspaceActionPromptTemplate(
  custom: Partial<Record<WorkspaceActionPromptId, string>> | undefined,
  id: WorkspaceActionPromptId
): string {
  return custom?.[id]?.trim() || DEFAULT_WORKSPACE_ACTION_PROMPTS[id]
}

export function renderWorkspaceActionPrompt(
  template: string,
  variables: Partial<Record<WorkspaceActionPromptVariable, string>>
): string {
  const byName = new Map<string, string | undefined>(Object.entries(variables))
  return template
    .replace(/\{\{(\w+)\}\}/g, (match, name: string) => byName.get(name) ?? match)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const REVIEW_REGROUP_PROMPT = `Group the work on branch {{branch}} in {{worktreePath}} against {{baseRef}} for review, and stop there.

- Use the orca-review skill, the rate-and-group phase only: rate every changed file and cluster the files into numbered groups, then write .orca/review-plan.json in this worktree.
- Do not review the code, do not stage any comments, and do not change any code.`
