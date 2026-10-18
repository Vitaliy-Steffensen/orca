import { ghExecFileAsync } from '../git/runner'
import {
  githubHostExecOptions,
  type GitHubApiRepository,
  type GitHubRepoExecOptions
} from './github-api-repository'
import { noteRepositoryRateLimitSpend, repositoryRateLimitGuard } from './rate-limit'

const COUNT_CACHE_TTL_MS = 60_000
const COUNT_CACHE_MAX_ENTRIES = 256
const THREAD_PAGE_SIZE = 100

export type UnresolvedReviewThreadCount = {
  count: number
  truncated: boolean
}

type CachedCount = {
  value: UnresolvedReviewThreadCount | null
  expiresAt: number
}

type ThreadCountResponse = {
  data?: {
    repository?: {
      pullRequest?: {
        reviewThreads?: {
          pageInfo?: { hasNextPage?: boolean }
          nodes?: ({ isResolved?: boolean } | null)[] | null
        } | null
      } | null
    } | null
  }
}

const countCache = new Map<string, CachedCount>()
const countInFlight = new Map<string, Promise<UnresolvedReviewThreadCount | null>>()

export function _resetUnresolvedReviewThreadCountCacheForTests(): void {
  countCache.clear()
  countInFlight.clear()
}

/** Counts unresolved review threads, including ones GitHub can no longer place on a line. */
export function countUnresolvedReviewThreads(
  response: ThreadCountResponse
): UnresolvedReviewThreadCount {
  const threads = response.data?.repository?.pullRequest?.reviewThreads
  const nodes = threads?.nodes ?? []
  let count = 0
  for (const node of nodes) {
    if (node && node.isResolved !== true) {
      count += 1
    }
  }
  return { count, truncated: threads?.pageInfo?.hasNextPage === true }
}

const THREAD_COUNT_QUERY = `
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: ${THREAD_PAGE_SIZE}) {
        pageInfo { hasNextPage }
        nodes { isResolved }
      }
    }
  }
}`

function cacheKey(
  repository: GitHubApiRepository,
  prNumber: number,
  executionScope: string
): string {
  return `${executionScope}\0${repository.owner}/${repository.repo}#${prNumber}`
}

function remember(
  key: string,
  value: UnresolvedReviewThreadCount | null
): UnresolvedReviewThreadCount | null {
  countCache.set(key, { value, expiresAt: Date.now() + COUNT_CACHE_TTL_MS })
  while (countCache.size > COUNT_CACHE_MAX_ENTRIES) {
    const oldestKey = countCache.keys().next().value
    if (oldestKey === undefined) {
      break
    }
    countCache.delete(oldestKey)
  }
  return value
}

async function fetchUnresolvedReviewThreadCount(
  repository: GitHubApiRepository,
  prNumber: number,
  ghOptions: GitHubRepoExecOptions
): Promise<UnresolvedReviewThreadCount | null> {
  if (repositoryRateLimitGuard(repository, 'graphql', ghOptions).blocked) {
    return null
  }
  noteRepositoryRateLimitSpend(repository, 'graphql', 1, ghOptions)
  const { stdout } = await ghExecFileAsync(
    [
      'api',
      'graphql',
      '-f',
      `query=${THREAD_COUNT_QUERY}`,
      '-f',
      `owner=${repository.owner}`,
      '-f',
      `repo=${repository.repo}`,
      '-F',
      `pr=${prNumber}`
    ],
    { ...ghOptions, ...githubHostExecOptions(repository) }
  )
  return countUnresolvedReviewThreads(JSON.parse(stdout) as ThreadCountResponse)
}

/**
 * Unresolved review threads for one pull request.
 * A miss returns null so the card stays quiet instead of showing a false zero.
 */
export async function readUnresolvedReviewThreadCount(
  repository: GitHubApiRepository,
  prNumber: number,
  ghOptions: GitHubRepoExecOptions,
  executionScope = 'local:host'
): Promise<UnresolvedReviewThreadCount | null> {
  const key = cacheKey(repository, prNumber, executionScope)
  const cached = countCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }
  const inflight = countInFlight.get(key)
  if (inflight) {
    return inflight
  }
  const request = fetchUnresolvedReviewThreadCount(repository, prNumber, ghOptions)
    .then((value) => remember(key, value))
    .catch(() => remember(key, null))
    .finally(() => {
      countInFlight.delete(key)
    })
  countInFlight.set(key, request)
  return request
}
