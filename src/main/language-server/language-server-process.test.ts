import { delimiter } from 'node:path'
import { describe, expect, it } from 'vitest'
import { languageServerEnvironment } from './language-server-process'

describe('language server environment', () => {
  it("adds a launch's variables and puts its directories first on PATH", () => {
    expect(
      languageServerEnvironment(
        { env: { VIRTUAL_ENV: '/v' }, pathPrefix: ['/v/bin'] },
        { PATH: '/usr/bin', HOME: '/h' }
      )
    ).toEqual({ PATH: `/v/bin${delimiter}/usr/bin`, HOME: '/h', VIRTUAL_ENV: '/v' })
  })

  it('passes the environment through for a launch that needs nothing', () => {
    const base = { PATH: '/usr/bin' }
    expect(languageServerEnvironment({ env: {}, pathPrefix: [] }, base)).toBe(base)
  })
})
