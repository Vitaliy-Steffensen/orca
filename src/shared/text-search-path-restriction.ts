/**
 * Bounds for confining a text search to an explicit path list. argv is the only
 * route (rg has no paths-from-file), and Windows caps a command line at 32767
 * chars — before any `wsl.exe -d <distro> --exec <rg>` prefix.
 */
export const MAX_RESTRICTED_SEARCH_PATHS = 1000
export const MAX_RESTRICTED_SEARCH_PATH_ARGV_BYTES = 24 * 1024

export type RestrictedSearchPaths = {
  paths: string[]
  truncated: boolean
}

export function isUsableRestrictedSearchPath(path: string): boolean {
  if (path.length === 0 || path.includes('\0')) {
    return false
  }
  if (path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:[/\\]/.test(path)) {
    return false
  }
  return !path.split(/[/\\]/).includes('..')
}

/** Drops unusable entries and trims to the argv budget; `truncated` means entries were dropped. */
export function clampRestrictedSearchPaths(paths: readonly string[]): RestrictedSearchPaths {
  const kept: string[] = []
  let bytes = 0
  let truncated = false
  const seen = new Set<string>()
  for (const path of paths) {
    if (!isUsableRestrictedSearchPath(path)) {
      truncated = true
      continue
    }
    if (seen.has(path)) {
      continue
    }
    if (kept.length >= MAX_RESTRICTED_SEARCH_PATHS) {
      truncated = true
      break
    }
    const size = Buffer.byteLength(path, 'utf8') + 1
    if (bytes + size > MAX_RESTRICTED_SEARCH_PATH_ARGV_BYTES) {
      truncated = true
      break
    }
    bytes += size
    seen.add(path)
    kept.push(path)
  }
  return { paths: kept, truncated }
}
