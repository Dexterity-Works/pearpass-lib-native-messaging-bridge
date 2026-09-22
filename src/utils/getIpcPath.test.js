import os from 'os'
import path from 'path'

import { getIpcPath } from './getIpcPath'

jest.mock('os')
jest.mock('path')
jest.mock('lockwright-lib-constants', () => ({
  IPC_SOCKET_DIR_NAME: '.pearpass'
}))

describe('getIpcPath', () => {
  const socketName = 'test-socket'

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns Windows pipe path when platform is win32', () => {
    os.platform.mockReturnValue('win32')
    const result = getIpcPath(socketName)
    expect(result).toBe('\\\\?\\pipe\\test-socket')
  })

  it('returns Unix socket path under homedir when platform is not win32', () => {
    os.platform.mockReturnValue('linux')
    os.homedir.mockReturnValue('/home/testuser')
    path.join.mockImplementation((...args) => args.join('/'))

    const result = getIpcPath(socketName)
    expect(result).toBe('/home/testuser/.pearpass/test-socket.sock')
    expect(path.join).toHaveBeenCalledWith(
      '/home/testuser',
      '.pearpass',
      'test-socket.sock'
    )
  })
})
