import { hasReachedAppVersion } from '../../shared/app-version'

/** The build the changelog already treats as an ACP server (subagents over ACP). */
const CURSOR_ACP_FLOOR = '2026.09.15'

/** `cursor-agent --version` prints `YYYY.MM.DD-<hex>`. The hex is a build token, not a prerelease. */
const CURSOR_BUILD = /^(\d{4}\.\d{2}\.\d{2})(?:-[0-9a-f]+)?$/i

/** Whether this Cursor CLI build serves `cursor-agent acp`. Older builds keep the terminal. */
export function cursorStructuredChatVersion(version: string): boolean {
  const date = CURSOR_BUILD.exec(version.trim())?.[1]
  return date !== undefined && hasReachedAppVersion(date, CURSOR_ACP_FLOOR)
}
