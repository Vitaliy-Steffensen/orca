/** 'starting-runtime' is the container engine coming up before any service starts. */
export type WorkspaceRunState = 'starting-runtime' | 'booting' | 'running'

export type WorkspaceRunServiceState = {
  label: string
  /** Every service of one run shares a tab; the pane inside it is the service. */
  tabId: string
  leafId: string
  readyPort?: number
  ready: boolean
}

export type WorkspaceRunEntry = {
  commandId: string
  state: WorkspaceRunState
  startedAt: number
  readyDeadlineAt: number
  services: WorkspaceRunServiceState[]
  openedBrowser: boolean
}

export type WorkspaceRunServiceObservation = {
  leafId: string
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
  const byLeafId = new Map(
    args.observations.map((observation) => [observation.leafId, observation])
  )

  if (entry.state === 'starting-runtime' || entry.services.length === 0) {
    return { entry, shouldOpenBrowser: false }
  }

  const present = entry.services.filter((service) => byLeafId.get(service.leafId)?.tabPresent)
  if (present.length === 0) {
    return { entry: null, shouldOpenBrowser: false }
  }

  const allPtysDead = present.every((service) => !byLeafId.get(service.leafId)?.ptyAlive)
  if (allPtysDead) {
    return {
      entry: null,
      shouldOpenBrowser: false,
      ...(entry.state === 'booting' ? { toast: 'exited-before-up' as const } : {})
    }
  }

  if (
    entry.state === 'running' &&
    present.some((service) => !byLeafId.get(service.leafId)?.ptyAlive)
  ) {
    return { entry: null, shouldOpenBrowser: false }
  }

  const services = present.map((service) => withReady(service, byLeafId.get(service.leafId), now))
  if (
    entry.state === 'booting' &&
    now >= entry.readyDeadlineAt &&
    services.some((service) => !service.ready)
  ) {
    return { entry: null, toast: 'timed-out', shouldOpenBrowser: false }
  }

  const allReady = services.every((service) => service.ready)
  const servicesUnchanged =
    services.length === entry.services.length &&
    present.length === entry.services.length &&
    services.every(
      (service, index) =>
        service.ready === entry.services[index]?.ready &&
        service.leafId === entry.services[index]?.leafId
    )
  // Leave openedBrowser false until the browser port is actually found. A
  // Docker/OrbStack listener can show up a scan later than the other service.
  if (allReady && entry.state === 'booting') {
    return {
      entry: { ...entry, state: 'running', services, openedBrowser: entry.openedBrowser },
      shouldOpenBrowser: !entry.openedBrowser
    }
  }
  if (allReady && entry.state === 'running' && !entry.openedBrowser) {
    return {
      entry: servicesUnchanged ? entry : { ...entry, services },
      shouldOpenBrowser: true
    }
  }

  if (servicesUnchanged) {
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
    const observation = args.observations.find((item) => item.leafId === service.leafId)
    if (!observation?.ptyAlive || observation.ptyAliveSince === null) {
      continue
    }
    waits.push(Math.max(0, observation.ptyAliveSince + WORKSPACE_RUN_LIVENESS_READY_MS - args.now))
  }
  return waits.length > 0 ? Math.min(...waits) : null
}
