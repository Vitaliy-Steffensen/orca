/** Line weight of a pull request, split into the four areas a sidebar card can show. */
export type DiffAreaTotals = {
  fe: number
  be: number
  e2e: number
  ci: number
}

export type DiffArea = keyof DiffAreaTotals

export type DiffAreaFile = {
  path: string
  additions?: number
  deletions?: number
}

const CI_PATH = /(?:^|[/\\])(?:\.github|\.circleci|\.buildkite|\.gitlab)(?:[/\\]|$)/i
const CI_FILE = /(?:^|[/\\])(?:Dockerfile|Jenkinsfile|lefthook\.ya?ml|docker-compose[^/\\]*)$/i
const E2E_PATH = /(?:^|[/\\])(?:e2e|cypress|playwright)(?:[/\\]|$)/i
const E2E_FILE = /\.e2e\.[^./\\]+$|(?:^|[/\\])(?:playwright|cypress)\.config\.[^./\\]+$/i
const FE_PATH = /(?:^|[/\\])(?:frontend|src[/\\]renderer|apps[/\\]web|packages[/\\]ui)(?:[/\\]|$)/i
const FE_EXT = /\.(?:tsx|jsx|vue|svelte|css|scss|less)$/i

/** CI and e2e win over a frontend extension, so a Playwright spec is not counted as UI. */
export function classifyDiffArea(filePath: string): DiffArea {
  if (CI_PATH.test(filePath) || CI_FILE.test(filePath)) {
    return 'ci'
  }
  if (E2E_PATH.test(filePath) || E2E_FILE.test(filePath)) {
    return 'e2e'
  }
  if (FE_PATH.test(filePath) || FE_EXT.test(filePath)) {
    return 'fe'
  }
  return 'be'
}

export function summarizeDiffAreas(
  files: readonly DiffAreaFile[] | null | undefined
): DiffAreaTotals | null {
  if (!files || files.length === 0) {
    return null
  }
  const totals: DiffAreaTotals = { fe: 0, be: 0, e2e: 0, ci: 0 }
  let weight = 0
  for (const file of files) {
    const lines = (file.additions ?? 0) + (file.deletions ?? 0)
    if (lines <= 0 || !file.path) {
      continue
    }
    totals[classifyDiffArea(file.path)] += lines
    weight += lines
  }
  return weight > 0 ? totals : null
}

/** `gh pr view --json files` is untyped at the lookup boundary. Drop anything that is not a path. */
export function readDiffAreaFiles(value: unknown): DiffAreaFile[] {
  if (!Array.isArray(value)) {
    return []
  }
  const files: DiffAreaFile[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const record = entry as { path?: unknown; additions?: unknown; deletions?: unknown }
    if (typeof record.path !== 'string' || record.path.length === 0) {
      continue
    }
    files.push({
      path: record.path,
      ...(typeof record.additions === 'number' ? { additions: record.additions } : {}),
      ...(typeof record.deletions === 'number' ? { deletions: record.deletions } : {})
    })
  }
  return files
}
