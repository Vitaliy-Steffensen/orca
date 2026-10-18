import type { DiffComment } from './diff-comment-types'
import { formatDiffComment } from './diff-comments-format'

// Fork: these sentences make agents answer in Orca's diff with `orca notes add`, which shows as a bot note.

const ADD_COMMAND = "orca notes add --file <path> --line <n> [--end-line <n>] --body '<markdown>'"

// Why spelled out here: agents rarely read the CLI help, and a double-quoted body lets the shell
// run its `backticks` as commands, so notes came out as one plain paragraph.
const BODY_FORMAT =
  'The body is markdown: lead with the point in one sentence, put \\n\\n between paragraphs, use "- " lists, and `backticks` for code; single-quote it so the shell leaves the backticks alone.'

export const NOTES_AGENT_NOTE_INSTRUCTION = `When you have addressed a note, reply to it saying what you did and why: orca notes reply --id <note id> --body '<markdown>'. ${BODY_FORMAT} Skip this if the orca command is not available.`

export const REVIEW_AGENT_NOTE_INSTRUCTION = `Also leave each finding as an agent note on its lines so it shows in the diff: ${ADD_COMMAND}. ${BODY_FORMAT} Skip this if the orca command is not available.`

const STAGE_COMMAND =
  "orca review comment add --file <path> --line <n> [--end-line <n>] --agent '<your name>' --body '<markdown>'"

// Why a sibling of the note instruction rather than a replacement: a note is commentary on the
// user's own diff, and this is a review of someone else's pull request. The two CLIs are not
// interchangeable, and an agent handed the wrong one writes where nobody is looking.
export const REVIEW_STAGED_COMMENT_INSTRUCTION = `Stage each confirmed finding on its lines in my pending review: ${STAGE_COMMAND}. ${BODY_FORMAT} Lead the body with the severity and what this diff has to do with the problem, like "🔴 Blocker · introduced", then **What:**, **Why:** and **Fix:** lines. Run orca review comment list first in case I already drafted something, and write the verdict and anything without a single line with orca review summary set --body '<markdown>'. Every comment you stage is a proposal: I accept or drop each one and submit the review under my own name, so stage only what you are sure of and keep the rest in your reply. Skip this if the orca command is not available.`

export function githubCommentAgentNoteInstruction(url: string | undefined): string {
  return `When you have addressed a review comment, leave an agent note on the lines you changed saying what you did, linked to that comment: ${ADD_COMMAND} --github-comment ${url ?? '<comment url>'}. ${BODY_FORMAT} Skip this if the orca command is not available.`
}

function threadHistory(earlier: readonly DiffComment[]): string {
  const lines = earlier.map(
    (message) => `- ${message.agentAuthor?.name ?? 'User'}: ${JSON.stringify(message.body)}`
  )
  return ['Earlier in this thread:', ...lines].join('\n')
}

/** `earlierInThread` returns the thread messages before a follow-up note, oldest first. */
export function formatDiffCommentsForAgent(
  comments: readonly DiffComment[],
  earlierInThread?: (comment: DiffComment) => readonly DiffComment[]
): string {
  const notes = comments.map((comment) => {
    const earlier = comment.replyToNoteId ? (earlierInThread?.(comment) ?? []) : []
    return [
      formatDiffComment(comment),
      ...(earlier.length > 0 ? [threadHistory(earlier)] : []),
      `Note id: ${comment.id}`
    ].join('\n')
  })
  return `${notes.join('\n\n')}\n\n${NOTES_AGENT_NOTE_INSTRUCTION}`
}
