/**
 * The changed-file set a panel's content search is confined to. `signature` is what
 * effects key on: git status polls constantly and rebuilds the array each time, so
 * array identity would re-fire the search on every poll.
 */
export type FileSearchPathRestriction = {
  paths: readonly string[]
  signature: string
}

export function createFileSearchPathRestriction(
  paths: readonly string[]
): FileSearchPathRestriction {
  return { paths, signature: paths.join('\n') }
}
