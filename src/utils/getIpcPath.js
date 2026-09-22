import os from 'os'
import path from 'path'

import { IPC_SOCKET_DIR_NAME } from 'lockwright-lib-constants'

/**
 * Returns cross-platform IPC path.
 * Uses os.homedir() so both the desktop app (Electron/Node) and the
 * bridge (Pear/bare-os) resolve to the same path without depending
 * on Pear.config.pearDir, and stays short enough for the 104-byte
 * macOS Unix-socket limit.
 * @param {string} socketName
 * @returns {string}
 */
export const getIpcPath = (socketName) => {
  if (os.platform() === 'win32') {
    return `\\\\?\\pipe\\${socketName}`
  }

  return path.join(os.homedir(), IPC_SOCKET_DIR_NAME, `${socketName}.sock`)
}
