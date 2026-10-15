import { describe, expect, it } from 'vitest'
import { readMentionQuery } from './review-mention-extension'

describe('readMentionQuery', () => {
  it('reads a GitHub login being typed', () => {
    expect(readMentionQuery('cc @madsen', 'user')).toBe('madsen')
    expect(readMentionQuery('cc @apps/front', 'user')).toBeNull()
  })

  it('reads a workspace path being typed when mentioning files', () => {
    expect(readMentionQuery('see @CLAUDE.md', 'file')).toBe('CLAUDE.md')
    expect(readMentionQuery('see @apps/frontend/src/a_b-c.ts', 'file')).toBe(
      'apps/frontend/src/a_b-c.ts'
    )
    expect(readMentionQuery('@', 'file')).toBe('')
  })

  it('ignores an @ inside a word, like an email address', () => {
    expect(readMentionQuery('mail me@example.com', 'file')).toBeNull()
    expect(readMentionQuery('mail me@example', 'user')).toBeNull()
  })
})
