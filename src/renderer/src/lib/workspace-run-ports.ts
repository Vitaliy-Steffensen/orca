import type { WorkspacePortScanResult } from '../../../shared/workspace-ports'

/** Every listener the scanner reported, including container and external ones. */
export function listeningPortNumbers(
  scans: Record<string, Pick<WorkspacePortScanResult, 'ports'> | undefined>
): Set<number> {
  const ports = new Set<number>()
  for (const scan of Object.values(scans)) {
    if (!scan) {
      continue
    }
    for (const port of scan.ports) {
      ports.add(port.port)
    }
  }
  return ports
}
