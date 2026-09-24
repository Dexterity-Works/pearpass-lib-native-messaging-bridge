jest.mock('pear-ipc', () => ({ Client: jest.fn() }))
jest.mock('./nativeMessagingHandler.js', () => {
  const { EventEmitter } = require('events')
  const instances = []
  class NativeMessagingHandler extends EventEmitter {
    constructor() {
      super()
      this.start = jest.fn()
      this.send = jest.fn()
      this.stop = jest.fn()
      instances.push(this)
    }
  }
  return { NativeMessagingHandler, instances }
})
jest.mock('./utils/getIpcPath.js', () => ({ getIpcPath: jest.fn() }))
jest.mock('./utils/log.js', () => ({ log: jest.fn() }))

const IPC = require('pear-ipc')

const { instances } = require('./nativeMessagingHandler.js')
const { getIpcPath } = require('./utils/getIpcPath.js')

const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('native messaging host IPC path', () => {
  let handler

  beforeAll(async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] })
    IPC.Client.mockImplementation(function (opts) {
      this.socketPath = opts.socketPath
      this.ready = jest.fn().mockResolvedValue()
      this.on = jest.fn()
      this.close = jest.fn()
    })
    getIpcPath.mockReturnValue('pipe-from-first-desktop-start')
    require('./bridge.js')
    await flush()
    handler = instances[0]
  })

  const checkAvailability = async (id) => {
    handler.emit('message', { id, command: 'checkAvailability' })
    await flush()
    return handler.send.mock.calls.find(([msg]) => msg.id === id)[0].result
  }

  const dropConnection = () => {
    const client = IPC.Client.mock.instances.at(-1)
    const [, onClose] = client.on.mock.calls.find(([e]) => e === 'close')
    onClose()
  }

  it('re-resolves the path on reconnect so a restarted desktop is found', async () => {
    expect(IPC.Client.mock.instances.at(-1).socketPath).toBe(
      'pipe-from-first-desktop-start'
    )

    dropConnection()
    getIpcPath.mockReturnValue('pipe-from-second-desktop-start')

    expect(await checkAvailability('1')).toMatchObject({ available: true })
    expect(IPC.Client.mock.instances.at(-1).socketPath).toBe(
      'pipe-from-second-desktop-start'
    )
  })

  it('reports not-running and opens no connection when no path is published', async () => {
    dropConnection()
    getIpcPath.mockReturnValue(null)
    const clientsBefore = IPC.Client.mock.calls.length

    expect(await checkAvailability('2')).toMatchObject({
      available: false,
      status: 'not-running'
    })
    expect(IPC.Client.mock.calls.length).toBe(clientsBefore)
  })
})
