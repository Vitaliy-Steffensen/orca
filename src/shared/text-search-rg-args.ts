/**
 * rg argv construction for the shared text-search path. Pure — no Electron,
 * child_process, or fs; the caller owns spawning and WSL path translation.
 */
import type { SearchOptions } from './code-search-types'
import { splitSearchGlobPatterns } from './text-search-glob-patterns'

// Why: keep search cheaper than opening a file; the editor read path has a larger cap (Monaco large-file handling).
const SEARCH_MAX_FILE_SIZE = 5 * 1024 * 1024

export type SearchOptionsLike = Pick<
  SearchOptions,
  'caseSensitive' | 'wholeWord' | 'useRegex' | 'includePattern' | 'excludePattern'
>

/**
 * Build the complete rg argv (flags + `--` + query + targets) for both callers to spawn as-is.
 *
 * Use target `.` with cwd set to the search root so anchored globs match root-relative paths.
 * Explicit root-relative targets confine the search to those paths; rg then searches them
 * regardless of ignore rules, while the globs below still apply on top.
 */
export function buildRgArgs(
  query: string,
  targets: readonly string[],
  opts: SearchOptionsLike
): string[] {
  const args: string[] = [
    '--no-config',
    '--json',
    '--hidden',
    '--glob',
    '!.git',
    '--max-filesize',
    `${Math.floor(SEARCH_MAX_FILE_SIZE / 1024 / 1024)}M`
  ]
  if (!opts.caseSensitive) {
    args.push('--ignore-case')
  }
  if (opts.wholeWord) {
    args.push('--word-regexp')
  }
  if (!opts.useRegex) {
    args.push('--fixed-strings')
  }
  if (opts.includePattern) {
    for (const pat of splitSearchGlobPatterns(opts.includePattern, 'rg')) {
      args.push('--glob', pat)
    }
  }
  if (opts.excludePattern) {
    for (const pat of splitSearchGlobPatterns(opts.excludePattern, 'rg')) {
      args.push('--glob', `!${pat}`)
    }
  }
  args.push('--', query, ...targets)
  return args
}
