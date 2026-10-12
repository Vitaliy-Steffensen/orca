import { translate } from '@/i18n/i18n'
import type { GitHubReaction } from '../../../../shared/github/comment-types'

export const REACTION_EMOJI: Record<GitHubReaction['content'], string> = {
  '+1': '👍',
  '-1': '👎',
  laugh: '😄',
  confused: '😕',
  heart: '❤️',
  hooray: '🎉',
  rocket: '🚀',
  eyes: '👀'
}

// Fork: who reacted, for a chip's hover. GitHub sends the first few reactors and the total.
export function formatCommentReactors(reaction: GitHubReaction): string | null {
  const names = reaction.reactors ?? []
  if (names.length === 0) {
    return null
  }
  const emoji = REACTION_EMOJI[reaction.content]
  const others = reaction.count - names.length
  if (others > 0) {
    return translate(
      'commentReactors.withOthers',
      '{{names}} and {{others}} others reacted with {{emoji}}',
      { names: names.join(', '), others, emoji }
    )
  }
  if (names.length === 1) {
    return translate('commentReactors.one', '{{name}} reacted with {{emoji}}', {
      name: names[0],
      emoji
    })
  }
  return translate('commentReactors.many', '{{names}} and {{last}} reacted with {{emoji}}', {
    names: names.slice(0, -1).join(', '),
    last: names.at(-1),
    emoji
  })
}
