export type WorkspaceRunServiceState = {
  label: string
  tabId: string
  readyPort?: number
  ready: boolean
}

export type WorkspaceRunEntry = {
  commandId: string
  state: 'booting' | 'running'
  startedAt: number
  readyDeadlineAt: number
  services: WorkspaceRunServiceState[]
  openedBrowser: boolean
}

export type WorkspaceRunServiceObservation = {
  tabId: string
  tabPresent: boolean
  ptyAlive: boolean
  ptyAliveSince: number | null
  portListening: boolean
}

export const WORKSPACE_RUN_LIVENESS_READY_MS = 3_000

export type WorkspaceRunToast = 'exited-before-up' | 'timed-out'

export type WorkspaceRunTransition = {
  entry: WorkspaceRunEntry | null
  toast?: WorkspaceRunToast
  shouldOpenBrowser: boolean
}

function withReady(
  service: WorkspaceRunServiceState,
  observation: WorkspaceRunServiceObservation | undefined,
  now: number
): WorkspaceRunServiceState {
  if (!observation?.ptyAlive) {
    return { ...service, ready: false }
  }
  if (service.readyPort !== undefined) {
    return { ...service, ready: observation.portListening }
  }
  const aliveSince = observation.ptyAliveSince
  const ready = aliveSince !== null && now - aliveSince >= WORKSPACE_RUN_LIVENESS_READY_MS
  return { ...service, ready }
}

export function transitionWorkspaceRun(args: {
  entry: WorkspaceRunEntry
  now: number
  observations: readonly WorkspaceRunServiceObservation[]
}): WorkspaceRunTransition {
  const { entry, now } = args
  const byTabId = new Map(args.observations.map((observation) => [observation.tabId, observation]))

  if (entry.services.length === 0) {
    return { entry, shouldOpenBrowser: false }
  }

  const present = entry.services.filter((service) => byTabId.get(service.tabId)?.tabPresent)
  if (present.length === 0) {
    return { entry: null, shouldOpenBrowser: false }
  }

  const allPtysDead = present.every((service) => !byTabId.get(service.tabId)?.ptyAlive)
  if (allPtysDead) {
    return {
      entry: null,
      shouldOpenBrowser: false,
      ...(entry.state === 'booting' ? { toast: 'exited-before-up' as const } : {})
    }
  }

  if (
    entry.state === 'running' &&
    present.some((service) => !byTabId.get(service.tabId)?.ptyAlive)
  ) {
    return { entry: null, shouldOpenBrowser: false }
  }

  const services = present.map((service) => withReady(service, byTabId.get(service.tabId), now))
  if (
    entry.state === 'booting' &&
    now >= entry.readyDeadlineAt &&
    services.some((service) => !service.ready)
  ) {
    return { entry: null, toast: 'timed-out', shouldOpenBrowser: false }
  }

  const allReady = services.every((service) => service.ready)
  if (entry.state === 'booting' && allReady) {
    return {
      entry: { ...entry, state: 'running', services, openedBrowser: true },
      shouldOpenBrowser: !entry.openedBrowser
    }
  }

  const unchanged =
    services.length === entry.services.length &&
    services.every(
      (service, index) =>
        service.ready === entry.services[index]?.ready &&
        service.tabId === entry.services[index]?.tabId
    )
  if (unchanged && present.length === entry.services.length) {
    return { entry, shouldOpenBrowser: false }
  }
  return { entry: { ...entry, services }, shouldOpenBrowser: false }
}

export function nextWorkspaceRunWakeMs(args: {
  entry: WorkspaceRunEntry
  now: number
  observations: readonly WorkspaceRunServiceObservation[]
}): number | null {
  if (args.entry.state !== 'booting') {
    return null
  }
  const waits = [Math.max(0, args.entry.readyDeadlineAt - args.now)]
  for (const service of args.entry.services) {
    if (service.readyPort !== undefined || service.ready) {
      continue
    }
    const observation = args.observations.find((item) => item.tabId === service.tabId)
    if (!observation?.ptyAlive || observation.ptyAliveSince === null) {
      continue
    }
    waits.push(Math.max(0, observation.ptyAliveSince + WORKSPACE_RUN_LIVENESS_READY_MS - args.now))
  }
  return waits.length > 0 ? Math.min(...waits) : null
}
