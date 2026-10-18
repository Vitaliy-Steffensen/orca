import { createEncryptedApiKeyFileStore } from './encrypted-api-key-file-store'

const fileStore = createEncryptedApiKeyFileStore({
  fileName: 'workspace-run-credentials.json',
  envelopePrefix: 'orca-workspace-run',
  providerLabel: 'Workspace Run',
  logScope: 'workspace-run'
})

type CredentialMap = Record<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMap(): CredentialMap {
  const raw = fileStore.read()
  if (!raw) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return {}
    }
    const map: CredentialMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.length > 0) {
        map[id] = value
      }
    }
    return map
  } catch {
    return {}
  }
}

function writeMap(map: CredentialMap): void {
  const ids = Object.keys(map)
  if (ids.length === 0) {
    fileStore.clear()
    return
  }
  fileStore.save(JSON.stringify(map))
}

export function hasWorkspaceRunPassword(id: string): boolean {
  return typeof readMap()[id] === 'string'
}

export function setWorkspaceRunPassword(id: string, password: string): void {
  const trimmed = password.trim()
  if (!id.trim() || !trimmed) {
    throw new Error('Workspace Run password is required')
  }
  const map = readMap()
  map[id] = trimmed
  writeMap(map)
}

export function clearWorkspaceRunPassword(id: string): void {
  const map = readMap()
  if (!(id in map)) {
    return
  }
  delete map[id]
  writeMap(map)
}

/** Main-process only. The preload API has no getter. */
export function readWorkspaceRunPassword(id: string): string | null {
  return readMap()[id] ?? null
}
