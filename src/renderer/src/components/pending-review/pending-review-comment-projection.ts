import type { PRComment } from '../../../../shared/github/comment-types'
import type { PendingReviewComment } from '../../../../shared/github/pending-review-comment'
import type { GitHubViewerIdentity } from './use-github-viewer'

/**
 * A queued comment shaped as the card the panel already renders.
 *
 * Why a projection rather than a second card: a draft is the same thing a posted comment
 * is — an author, a body, a line, a time — and the one difference, that it has not been
 * sent, is what the Pending badge says. The id is negative and deliberately unusable as a
 * provider id: every action on these rows is wired to the draft, never to the number.
 */
export function projectPendingReviewComment(
  comment: PendingReviewComment,
  viewer: GitHubViewerIdentity | null
): PRComment {
  return {
    id: -1,
    // Why the agent takes the byline: a comment it staged is not yours until you keep it, and
    // the name is the only thing telling you which rows you have not read yet. It goes no
    // further than this card — submitting sends the body and the line, never the author.
    author: comment.agentAuthor?.name ?? viewer?.login ?? '',
    authorAvatarUrl: comment.agentAuthor ? '' : (viewer?.avatarUrl ?? ''),
    // Why the bot flag: the row then carries the badge every automated comment carries, so a
    // staged draft reads as one at a glance — and stops being one the moment the review is sent.
    ...(comment.agentAuthor ? { isBot: true } : {}),
    body: comment.body,
    createdAt: new Date(comment.createdAt).toISOString(),
    url: '',
    path: comment.path,
    line: comment.line,
    ...(comment.startLine !== undefined ? { startLine: comment.startLine } : {})
  }
}
