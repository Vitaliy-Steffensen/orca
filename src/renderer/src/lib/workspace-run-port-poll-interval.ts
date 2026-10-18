const IDLE_PORT_SCAN_INTERVAL_MS = 30_000
const BOOTING_PORT_SCAN_INTERVAL_MS = 2_000

export function portScanIntervalMsForRunState(hasBootingRun: boolean): number {
  return hasBootingRun ? BOOTING_PORT_SCAN_INTERVAL_MS : IDLE_PORT_SCAN_INTERVAL_MS
}
