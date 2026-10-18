const READY_PORT_ENV_NAME = /^[A-Z][A-Z0-9_]{0,63}$/

/** Read `NAME = { default = "5173" }` from a fnox local file. */
export function readWorkspaceRunReadyPortFromToml(
  text: string,
  envName: string
): number | undefined {
  if (!READY_PORT_ENV_NAME.test(envName)) {
    return undefined
  }
  const pattern = new RegExp(String.raw`^\s*${envName}\s*=\s*\{\s*default\s*=\s*"(\d+)"`, 'm')
  const match = pattern.exec(text)
  if (!match?.[1]) {
    return undefined
  }
  const port = Number(match[1])
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return undefined
  }
  return port
}
