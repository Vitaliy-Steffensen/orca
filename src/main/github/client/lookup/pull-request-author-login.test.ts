import { describe, expect, it } from 'vitest'
import { pullRequestAuthorLogin } from './pull-request-lookup-data'

describe('pullRequestAuthorLogin', () => {
  it('reads the login gh returns for the pull request author', () => {
    expect(pullRequestAuthorLogin({ author: { login: 'madsenmm' } })).toBe('madsenmm')
    expect(pullRequestAuthorLogin({ author: { login: '  ' } })).toBeNull()
    expect(pullRequestAuthorLogin({ author: null })).toBeNull()
    expect(pullRequestAuthorLogin({})).toBeNull()
  })
})
