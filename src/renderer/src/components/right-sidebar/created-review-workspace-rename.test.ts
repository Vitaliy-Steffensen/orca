import { describe, expect, it } from 'vitest'
import { resolveCreatedReviewWorkspaceRename } from './created-review-workspace-rename'

const workspace = {
  branch: 'refs/heads/feature/login',
  displayName: 'feature/login',
  path: '/repos/orca-feature-login'
}

describe('resolveCreatedReviewWorkspaceRename', () => {
  it('takes the review title for a branch-derived workspace label', () => {
    expect(
      resolveCreatedReviewWorkspaceRename(
        { ...workspace, displayNameMode: 'automatic' },
        '  Fix the login redirect  '
      )
    ).toEqual({ displayName: 'Fix the login redirect' })
  })

  it('leaves a label the user wrote themselves alone', () => {
    expect(
      resolveCreatedReviewWorkspaceRename(
        { ...workspace, displayName: 'Monday spike', displayNameMode: 'fixed' },
        'Fix the login redirect'
      )
    ).toBeNull()
  })

  it('reads a missing mode from the branch-derived label, including a CLI-created workspace', () => {
    expect(resolveCreatedReviewWorkspaceRename(workspace, 'Fix the login redirect')).toEqual({
      displayName: 'Fix the login redirect'
    })
    expect(
      resolveCreatedReviewWorkspaceRename(
        { ...workspace, displayName: 'Monday spike' },
        'Fix the login redirect'
      )
    ).toBeNull()
    expect(
      resolveCreatedReviewWorkspaceRename(
        { ...workspace, cliProvenance: { kind: 'created-by-cli', createdAt: 0 } },
        'Fix the login redirect'
      )
    ).toBeNull()
  })

  it('falls back to the folder name while the workspace is detached', () => {
    expect(
      resolveCreatedReviewWorkspaceRename(
        { ...workspace, branch: '', displayName: 'orca-feature-login' },
        'Fix the login redirect'
      )
    ).toEqual({ displayName: 'Fix the login redirect' })
  })

  it('stays put without a workspace, without a title, or when the label already matches', () => {
    expect(resolveCreatedReviewWorkspaceRename(null, 'Fix the login redirect')).toBeNull()
    expect(resolveCreatedReviewWorkspaceRename(workspace, '   ')).toBeNull()
    expect(resolveCreatedReviewWorkspaceRename(workspace, undefined)).toBeNull()
    expect(
      resolveCreatedReviewWorkspaceRename(
        { ...workspace, displayNameMode: 'automatic' },
        'feature/login'
      )
    ).toBeNull()
  })
})
