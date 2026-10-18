import type { GitBranchChangeEntry } from './git-diff-compare-types'
import type { GitBranchChangeStatus } from './git-status-types'
import { parseNumstat } from './git-uncommitted-line-stats'

const CHANGE_STATUS: Record<string, GitBranchChangeStatus> = {
  A: 'added',
  D: 'deleted',
  R: 'renamed',
  C: 'copied'
}

export function gitChangeListArgs(fromOid: string | null, toOid: string): string[] {
  // Why --no-abbrev: the default abbreviation length grows with the repository, so an abbreviated
  // blob oid is not a stable identity for "this file is unchanged since you last read it".
  const format = ['--raw', '--no-abbrev', '--numstat', '-z', '-M', '-C']
  return fromOid
    ? ['diff', ...format, fromOid, toOid, '--']
    : ['diff-tree', '--root', '--no-commit-id', '-r', ...format, toOid, '--']
}

/** Git prints an all-zero oid when it has no object for that side, which is not an identity. */
function readBlobOid(value: string | undefined): string | undefined {
  return value === undefined || /^0+$/.test(value) ? undefined : value
}

export function parseGitChangeList(
  stdout: string,
  format: 'raw' | 'name-status' = 'raw'
): GitBranchChangeEntry[] {
  const entries: GitBranchChangeEntry[] = []
  let offset = 0
  function readField(): string {
    const end = stdout.indexOf('\0', offset)
    if (end === -1) {
      throw new Error('Incomplete Git change record')
    }
    const value = stdout.slice(offset, end)
    offset = end + 1
    return value
  }

  // Raw records precede numstat records; filenames are separate NUL-delimited fields.
  while (offset < stdout.length && (format === 'name-status' || stdout[offset] === ':')) {
    const header = readField()
    const match =
      format === 'name-status'
        ? /^([A-Z])\d*$/.exec(header)
        : /^:[0-7]{6} [0-7]{6} ([0-9a-f]+) ([0-9a-f]+) ([A-Z])\d*$/.exec(header)
    if (!match) {
      throw new Error('Invalid Git change record')
    }
    const code = (format === 'name-status' ? match[1] : match[3]) ?? ''
    const baseOid = format === 'name-status' ? undefined : readBlobOid(match[1])
    const headOid = format === 'name-status' ? undefined : readBlobOid(match[2])
    const firstPath = readField()
    const oldPath = code === 'R' || code === 'C' ? firstPath : undefined
    const path = oldPath === undefined ? firstPath : readField()
    if (!path || oldPath === '') {
      throw new Error('Missing Git change path')
    }
    entries.push({
      path,
      status: CHANGE_STATUS[code] ?? 'modified',
      ...(oldPath === undefined ? {} : { oldPath }),
      ...(baseOid === undefined ? {} : { baseOid }),
      ...(headOid === undefined ? {} : { headOid })
    })
  }
  if (offset === stdout.length) {
    return entries
  }
  const statsByPath = parseNumstat(stdout.slice(offset))
  return entries.map((entry) => ({ ...entry, ...statsByPath.get(entry.path) }))
}
