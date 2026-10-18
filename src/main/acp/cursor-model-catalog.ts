import type { AgentSessionModelOption } from '../../shared/agent-session-wire'

const ANSI = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*m`, 'g')

/** One model line from `cursor-agent models`: `id - Name (current, default)`. */
const MODEL_LINE = /^(\S+?)(?:\s+-\s+(.*?))?(?:\s+\(([^)]*)\))?$/

function tags(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
}

/** The models `cursor-agent models` prints. A line that is not a model is skipped. */
export function parseCursorAcpModelListing(stdout: string): AgentSessionModelOption[] {
  const models: AgentSessionModelOption[] = []
  const seen = new Set<string>()
  for (const raw of stdout.replace(ANSI, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (line.length === 0 || line === 'Available models' || line.startsWith('Tip:')) {
      continue
    }
    const match = MODEL_LINE.exec(line)
    const id = match?.[1]
    if (!match || !id || seen.has(id)) {
      continue
    }
    seen.add(id)
    const label = match[2]?.trim()
    models.push({
      id,
      label: label && label.length > 0 ? label : id,
      isDefault: tags(match[3]).includes('default'),
      efforts: []
    })
  }
  return models
}
