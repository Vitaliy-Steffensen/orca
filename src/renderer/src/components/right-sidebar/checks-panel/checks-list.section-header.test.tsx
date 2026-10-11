// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { PRCheckDetail } from '../../../../../shared/github/check-types'
import { ChecksList } from './checks-list'

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ openCheckRunDetails: vi.fn(), patchOpenCheckRunDetails: vi.fn() })
}))
vi.mock('@/store/selectors', () => ({ useActiveWorktree: () => null }))

afterEach(cleanup)

const check = (name: string, conclusion: PRCheckDetail['conclusion']): PRCheckDetail => ({
  name,
  status: 'completed',
  conclusion,
  url: null
})

function renderChecks(checks: PRCheckDetail[]) {
  render(
    <TooltipProvider>
      <ChecksList
        sectionHeader
        checks={checks}
        checksLoading={false}
        checkDetailsContextKey="ctx"
        onLoadCheckDetails={vi.fn()}
        githubRepository={null}
        getGitLabProjectRef={() => null}
      />
    </TooltipProvider>
  )
}

describe('ChecksList as a PR panel section', () => {
  it('heads the list with the shared section header, its counts as actions', () => {
    renderChecks([check('lint', 'success'), check('test', 'failure')])
    const heading = screen.getByRole('button', { name: /Checks/ })
    expect(heading.textContent).toContain('2')
    expect(screen.getByText(/passing/)).toBeTruthy()
    expect(screen.getByText(/failing/)).toBeTruthy()
    expect(screen.getByText('lint')).toBeTruthy()

    fireEvent.click(heading)
    expect(screen.queryByText('lint')).toBeNull()
  })

  it('keeps its header with no checks, so the section can still be moved', () => {
    renderChecks([])
    expect(screen.getByRole('button', { name: /Checks/ })).toBeTruthy()
  })
})
