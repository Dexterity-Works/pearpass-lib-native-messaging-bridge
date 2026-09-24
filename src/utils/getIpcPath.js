import fs from 'fs'
import os from 'os'
import path from 'path'

import { IPC_SOCKET_DIR_NAME } from 'lockwright-lib-constants'

/**
 * Returns cross-platform IPC path.
 * Uses os.homedir() so both the desktop app (Electron/Node) and the
 * bridge (Pear/bare-os) resolve to the same path without depending
 * on Pear.config.pearDir, and stays short enough for the 104-byte
 * macOS Unix-socket limit.
 *
 * Windows pipe names are machine-global: any local user can squat a
 * well-known one and receive the pairing token. The desktop listens on
 * `<socketName>-<32 hex>` instead, fresh per start, and publishes that
 * name in `<home>/<IPC_SOCKET_DIR_NAME>/<socketName>.pipe`. Never guess
 * a name: no valid published pipe means the desktop is not running.
 * @param {string} socketName
 * @returns {string|null} null on win32 when no valid pipe is published
 */
export const getIpcPath = (socketName) => {
  if (os.platform() === 'win32') {
    let pipePath
    try {
      pipePath = fs.readFileSync(
        path.join(os.homedir(), IPC_SOCKET_DIR_NAME, `${socketName}.pipe`),
        'utf8'
      )
    } catch {
      return null
    }
    const prefix = `\\\\?\\pipe\\${socketName}-`
    const suffix = pipePath.slice(prefix.length)
    return pipePath.startsWith(prefix) && /^[0-9a-f]{32}$/.test(suffix)
      ? pipePath
      : null
  }

  return path.join(os.homedir(), IPC_SOCKET_DIR_NAME, `${socketName}.sock`)
}
