import { delimiter } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  languageServerEnvironment,
  languageServerExitFailure,
  languageServerStartFailure
} from './language-server-process'

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

describe('language server start failure', () => {
  const enoent = Object.assign(new Error('spawn tsgo ENOENT'), { code: 'ENOENT' })

  it('names the path a typed server was looked for at', () => {
    expect(
      languageServerStartFailure({ serverName: 'tsgo', program: '/opt/bin/tsgo' }, enoent)
    ).toBe('tsgo is not at /opt/bin/tsgo')
  })

  it('says a bare command is missing from the project and PATH', () => {
    expect(languageServerStartFailure({ serverName: 'tsgo', program: 'tsgo' }, enoent)).toBe(
      'tsgo is not installed in this project, and tsgo is not on PATH'
    )
  })

  it('passes any other spawn error through', () => {
    expect(
      languageServerStartFailure(
        { serverName: 'pyrefly', program: 'pyrefly' },
        Object.assign(new Error('permission denied'), { code: 'EACCES' })
      )
    ).toBe('pyrefly could not start: permission denied')
  })
})

describe('language server exit failure', () => {
  it("reports the server's last words", () => {
    expect(
      languageServerExitFailure({ serverName: 'pyrefly' }, 'warming up\nno such option\n')
    ).toBe('pyrefly exited: no such option')
  })

  it('says nothing for a server that exited quietly', () => {
    expect(languageServerExitFailure({ serverName: 'pyrefly' }, '  \n')).toBeUndefined()
  })
})
