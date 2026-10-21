import type { HandlerGroup } from './handler-group-manifest'
import { BROWSER_HANDLER_GROUPS } from './browser-handler-groups'

// Fork: the fork's CLI groups ride on upstream's browser spread, since the manifest sits at its line cap.
export const BROWSER_AND_FORK_HANDLER_GROUPS: readonly HandlerGroup[] = [
  ...BROWSER_HANDLER_GROUPS,
  {
    name: 'notes',
    keys: ['notes add', 'notes reply', 'notes list', 'notes rm'],
    load: async () => (await import('./handlers/notes.js')).NOTES_HANDLERS
  },
  {
    name: 'review',
    keys: [
      'review comment add',
      'review comment list',
      'review comment rm',
      'review summary set',
      'review summary show',
      'review asset upload'
    ],
    load: async () => (await import('./handlers/review.js')).REVIEW_HANDLERS
  }
]
