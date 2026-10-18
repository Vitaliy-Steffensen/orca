import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const REVIEW_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['review', 'comment', 'add'],
    summary: "Stage an inline comment on the user's unsent review of this workspace's pull request",
    usage:
      'orca review comment add --file <path> --line <n> [--end-line <n>] --body <text> [--agent <name>] [--worktree <selector>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'file', 'line', 'end-line', 'body', 'agent', 'worktree'],
    notes: [
      "Use it to draft a review of someone else's pull request: the comments wait in the user's review shelf, where they accept, edit or drop each one and submit the review themselves under their own name. You cannot submit it, and nothing is sent to the provider until they do.",
      'Line numbers are in the current version of the file, and --file may be relative to cwd or absolute inside the worktree, exactly as in orca notes add. The staged comment is marked as yours until the review is submitted, after which it carries no agent attribution at all.',
      'The body is markdown shown in a narrow card: lead with the point in one sentence, put a blank line (\\n\\n) between paragraphs, use a "- " list for several findings, and `backticks` for code. A literal \\n in --body becomes a line break.',
      'Single-quote --body: inside double quotes the shell runs `backticks` as commands and the code drops out of the comment.',
      "The queue lives on the device whose Orca app submits the review, so this fails on a headless Orca server (orca serve) rather than staging where nobody will look. Use orca notes add for commentary on the user's own diff."
    ],
    examples: [
      "orca review comment add --file src/api.ts --line 42 --body 'This retry loop never backs off, so a 500 storms the upstream.'",
      "orca review comment add --file src/color.ts --line 3 --end-line 20 --body 'Dedupes by exact `value` string.\\n\\n- Breaks for rgb() and rgba() spellings of one colour.'"
    ]
  },
  {
    path: ['review', 'comment', 'list'],
    summary: "List the review comments staged for this workspace's pull request",
    usage: 'orca review comment list [--worktree <selector>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree'],
    examples: ['orca review comment list', 'orca review comment list --json']
  },
  {
    path: ['review', 'comment', 'rm'],
    summary: 'Remove a staged review comment',
    usage: 'orca review comment rm --id <id> [--worktree <selector>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'id', 'worktree'],
    examples: ['orca review comment rm --id 3f2a…']
  },
  {
    path: ['review', 'summary', 'set'],
    summary: "Write the summary of the user's unsent review, shown above the verdict buttons",
    usage: 'orca review summary set --body <text> [--worktree <selector>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'body', 'worktree'],
    notes: [
      'Replaces whatever is in the summary box, so read it with orca review comment list first if the user may have typed there. An empty --body clears it.',
      'Markdown, laid out like orca review comment add. Single-quote --body so the shell keeps the backticks.'
    ],
    examples: [
      "orca review summary set --body 'Looks right overall.\\n\\n- Two retry paths need backoff.\\n- The migration is missing a down step.'"
    ]
  }
]
