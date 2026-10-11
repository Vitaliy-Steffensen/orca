import { describe, expect, it } from 'vitest'
import { resolveLaunch } from './language-server-launchers'

const python = {
  language: 'python' as const,
  server: 'pyrefly',
  command: null,
  filePath: '/repo/apps/backend/a.py',
  worktreeRoot: '/repo',
  repoRoot: '/repo',
  venvSetting: null,
  text: '',
  line: 0,
  character: 0
}

const typescript = {
  ...python,
  language: 'typescript' as const,
  server: 'tsgo',
  filePath: '/repo/apps/frontend/src/a.tsx'
}

function existsIn(paths: string[]) {
  const set = new Set(paths)
  return (path: string) => set.has(path)
}

const backend = ['/repo/apps/backend/pyproject.toml', '/repo/apps/backend/.venv/bin/python']

describe('language server launchers', () => {
  it("runs the chosen Python server from the project's venv, inside that venv", () => {
    expect(
      resolveLaunch(
        { ...python, server: 'pyright' },
        existsIn([...backend, '/repo/apps/backend/.venv/bin/pyright-langserver'])
      )
    ).toEqual({
      language: 'python',
      serverName: 'Pyright',
      projectRoot: '/repo/apps/backend',
      program: '/repo/apps/backend/.venv/bin/pyright-langserver',
      args: ['--stdio'],
      env: { VIRTUAL_ENV: '/repo/apps/backend/.venv' },
      pathPrefix: ['/repo/apps/backend/.venv/bin']
    })
  })

  it('falls back to the server on PATH, and to the default for a server it does not know', () => {
    expect(resolveLaunch({ ...python, server: 'ty' }, existsIn(backend))).toMatchObject({
      serverName: 'ty',
      program: 'ty',
      args: ['server']
    })
    expect(resolveLaunch({ ...python, server: 'gone' }, existsIn(backend))).toMatchObject({
      serverName: 'pyrefly',
      program: 'pyrefly',
      args: ['lsp']
    })
  })

  it('uses a custom path as given', () => {
    expect(
      resolveLaunch(
        { ...python, server: 'pyright', command: '/opt/pyright/bin/pyright-langserver' },
        existsIn([...backend, '/repo/apps/backend/.venv/bin/pyright-langserver'])
      )
    ).toMatchObject({ program: '/opt/pyright/bin/pyright-langserver', args: ['--stdio'] })
  })

  it('expands a custom path that starts at the home directory', () => {
    expect(
      resolveLaunch(
        { ...python, server: 'pyright', command: '~/tools/pyright-langserver' },
        existsIn(backend),
        '/Users/me'
      ).program
    ).toBe('/Users/me/tools/pyright-langserver')
  })

  it("runs the chosen TypeScript server from the nearest node_modules, else the main checkout's", () => {
    expect(
      resolveLaunch(
        { ...typescript, server: 'typescript-language-server' },
        existsIn([
          '/repo/apps/frontend/tsconfig.json',
          '/repo/node_modules/.bin/typescript-language-server'
        ])
      )
    ).toEqual({
      language: 'typescript',
      serverName: 'typescript-language-server',
      projectRoot: '/repo/apps/frontend',
      program: '/repo/node_modules/.bin/typescript-language-server',
      args: ['--stdio'],
      env: {},
      pathPrefix: []
    })
    expect(
      resolveLaunch(
        { ...typescript, filePath: '/wt/apps/frontend/a.ts', worktreeRoot: '/wt' },
        existsIn(['/wt/apps/frontend/tsconfig.json', '/repo/apps/frontend/node_modules/.bin/tsgo'])
      )
    ).toMatchObject({
      program: '/repo/apps/frontend/node_modules/.bin/tsgo',
      args: ['--lsp', '--stdio']
    })
  })
})
