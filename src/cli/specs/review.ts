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
  },
  {
    path: ['review', 'summary', 'show'],
    summary: "Print the summary currently on the user's unsent review",
    usage: 'orca review summary show [--worktree <selector>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree'],
    notes: [
      'Read this before orca review summary set: whatever is there was typed by the user or written by an earlier pass, and set replaces all of it.',
      'An empty result means the summary box is empty.'
    ],
    examples: ['orca review summary show', 'orca review summary show --json']
  },
  {
    path: ['review', 'asset', 'upload'],
    summary: 'Attach an image or video to the repository and print the link to embed in a review',
    usage: 'orca review asset upload --file <path> [--worktree <selector>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'file', 'worktree'],
    notes: [
      'Prints a https://github.com/user-attachments/assets/… URL. That is the only kind of image link a review summary or comment renders — a local path or a file:// URL degrades to plain text, so a screenshot must go through this command before it is embedded.',
      'Embed it as markdown: `![what it shows](<the printed url>)`.',
      'PNG, JPEG, GIF and WebP up to 10 MB; MP4, QuickTime and WebM up to 100 MB. The file is read where this command runs, so it works from an SSH or server host too.',
      'Needs a GitHub remote, a gh login and write access to the repository. On a repository hosted anywhere else this fails and the screenshots stay in your reply; that is not a reason to fail the review.'
    ],
    examples: [
      'orca review asset upload --file .context/review/my-branch/1-empty-state.png',
      'orca review asset upload --file /tmp/shot.png --json'
    ]
  }
]
