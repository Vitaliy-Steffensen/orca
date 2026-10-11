import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SourceControlCommitSurface } from './commit-surface'

type Props = Parameters<typeof SourceControlCommitSurface>[0]

describe('SourceControlCommitSurface', () => {
  it('shows no commit box: committing is left to the agent or the CLI', () => {
    const props = {
      activeRepo: { id: 'repo' },
      worktreePath: '/repo',
      showGenericEmptyState: false,
      model: {
        directCreatePrAction: null,
        commitMessage: '',
        grouped: { staged: [], unstaged: [], untracked: [] },
        unresolvedConflicts: []
      }
    } as unknown as Props
    expect(renderToStaticMarkup(<SourceControlCommitSurface {...props} />)).toBe('')
  })
})
