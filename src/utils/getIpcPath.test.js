import fs from 'fs'
import os from 'os'
import path from 'path'

import { getIpcPath } from './getIpcPath'

jest.mock('fs')
jest.mock('os')
jest.mock('path')
jest.mock('lockwright-lib-constants', () => ({
  IPC_SOCKET_DIR_NAME: '.pearpass'
}))

describe('getIpcPath', () => {
  const socketName = 'test-socket'

  beforeEach(() => {
    os.homedir.mockReturnValue('/home/testuser')
    path.join.mockImplementation((...args) => args.join('/'))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('on win32', () => {
    const published = `\\\\?\\pipe\\test-socket-${'0123456789abcdef'.repeat(2)}`

    beforeEach(() => {
      os.platform.mockReturnValue('win32')
    })

    it('returns the pipe the desktop published in the socket dir', () => {
      fs.readFileSync.mockReturnValue(published)

      expect(getIpcPath(socketName)).toBe(published)
      expect(fs.readFileSync).toHaveBeenCalledWith(
        '/home/testuser/.pearpass/test-socket.pipe',
        'utf8'
      )
    })

    it('returns null when the desktop has not published a pipe', () => {
      fs.readFileSync.mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      })

      expect(getIpcPath(socketName)).toBeNull()
    })

    it.each([
      ['the machine-global pipe', '\\\\?\\pipe\\test-socket'],
      ['another pipe name', `\\\\?\\pipe\\evil-${'0'.repeat(32)}`],
      ['a short suffix', '\\\\?\\pipe\\test-socket-abc123'],
      ['an uppercase suffix', `\\\\?\\pipe\\test-socket-${'A'.repeat(32)}`],
      ['trailing junk', `${published}\n\\\\?\\pipe\\test-socket`],
      ['a UNC path', `\\\\attacker\\pipe\\test-socket-${'0'.repeat(32)}`]
    ])('returns null for %s', (_, contents) => {
      fs.readFileSync.mockReturnValue(contents)

      expect(getIpcPath(socketName)).toBeNull()
    })
  })

  it('returns Unix socket path under homedir when platform is not win32', () => {
    os.platform.mockReturnValue('linux')

    const result = getIpcPath(socketName)
    expect(result).toBe('/home/testuser/.pearpass/test-socket.sock')
    expect(path.join).toHaveBeenCalledWith(
      '/home/testuser',
      '.pearpass',
      'test-socket.sock'
    )
    expect(fs.readFileSync).not.toHaveBeenCalled()
  })
})
