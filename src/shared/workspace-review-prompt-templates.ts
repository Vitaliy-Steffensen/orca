import { REVIEW_STAGED_COMMENT_INSTRUCTION } from './agent-note-prompt'

export const DEFAULT_REVIEW_PROMPT_TEMPLATE = `You are reviewing pull request #{{prNumber}} — "{{title}}" by {{author}} ({{url}}).
The branch {{branch}} is checked out and the diff is pointed at {{baseRef}}.

If you have the review-pr skill, use it: it picks the passes this diff needs, checks the UI in the browser when one changed, and handles the staging below. Otherwise follow the rest of this prompt.

What UI changes should I check for?

Analyse the changes, and point out the most important bits of the PR and what could be
potential weak points. Analyse the architecture decisions; are they aligned with the codebase?

${REVIEW_STAGED_COMMENT_INSTRUCTION}`

export const DEFAULT_REREVIEW_PROMPT_TEMPLATE = `You reviewed pull request #{{prNumber}} — "{{title}}" by {{author}} ({{url}}) before, and {{author}} has asked you to look again.
The branch {{branch}} is checked out and the diff is pointed at {{sinceCommit}}, the commit you last reviewed, so it shows only what has changed since.

If you have the re-review skill, use it. Otherwise follow the rest of this prompt.

Find the changes I asked for in my own review comments on this pull request, and for each one say how {{author}} answered it: done as asked, done differently, or not addressed. Quote the relevant part of the new code.

Then flag anything new that arrived with these commits and was not part of what I asked for.

${REVIEW_STAGED_COMMENT_INSTRUCTION}`
