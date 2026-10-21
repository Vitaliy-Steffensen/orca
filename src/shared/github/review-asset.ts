import type { GitHubRepositoryIdentity } from './pull-request-types'

export type ReviewAssetKind = 'image' | 'video'

export type UploadReviewAssetRequest = {
  name: string
  contentType: string
  bytes: Uint8Array
  repo: GitHubRepositoryIdentity
}

export type UploadReviewAssetResult =
  | { ok: true; url: string; kind: ReviewAssetKind }
  | { ok: false; error: string }

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

// Why these numbers: GitHub's own attachment limits; a larger file is refused only after the whole
// upload, so it is cheaper to say so first.
export const REVIEW_ASSET_MAX_BYTES: Record<ReviewAssetKind, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024
}

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm'
}

/** The attachment type a file name claims, for callers that have a path rather than a picked file. */
export function reviewAssetContentTypeForName(name: string): string | null {
  const extension = name.toLowerCase().split('.').pop()
  return extension ? (CONTENT_TYPE_BY_EXTENSION[extension] ?? null) : null
}

export function reviewAssetKind(contentType: string): ReviewAssetKind | null {
  const type = contentType.toLowerCase()
  if (IMAGE_TYPES.has(type)) {
    return 'image'
  }
  return VIDEO_TYPES.has(type) ? 'video' : null
}

const GITHUB_ATTACHMENT_URL = /^https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]{36}$/i

export function isGitHubAttachmentAssetUrl(href: string | undefined): href is string {
  return typeof href === 'string' && GITHUB_ATTACHMENT_URL.test(href)
}
