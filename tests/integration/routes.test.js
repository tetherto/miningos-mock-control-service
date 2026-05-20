'use strict'

const net = require('net')
const test = require('brittle')
const MockControlAgent = require('../../mock-control-agent')
const { createMockThingHandlers } = require('../helpers/mock-thing')

function getFreePort () {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
    server.on('error', reject)
  })
}

async function startAgent (things) {
  const port = await getFreePort()
  const agent = new MockControlAgent({
    thgs: things,
    port
  })

  await agent.init(async (thing) => {
    const mock = createMockThingHandlers({ id: thing.id, status: 'ok' })
    return mock
  })

  const baseUrl = `http://127.0.0.1:${port}`

  return {
    agent,
    baseUrl,
    async close () {
      await agent.server.close()
    }
  }
}

test('GET /things returns all registered things', async (t) => {
  const { baseUrl, close } = await startAgent([
    { id: 'alpha' },
    { id: 'beta' }
  ])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/things`)
  const body = await res.json()

  t.is(res.status, 200)
  t.is(body.length, 2)
  t.is(body.map((thing) => thing.id).sort().join(','), 'alpha,beta')
})

test('GET /things supports mingo query filter', async (t) => {
  const { baseUrl, close } = await startAgent([
    { id: 'alpha' },
    { id: 'beta' }
  ])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/things?q=${encodeURIComponent(JSON.stringify({ id: 'beta' }))}`)
  const body = await res.json()

  t.is(res.status, 200)
  t.is(body.length, 1)
  t.is(body[0].id, 'beta')
})

test('POST /thing/:id updates device state', async (t) => {
  const { agent, baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/thing/device-1`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state: { status: 'busy' } })
  })

  t.is(res.status, 200)
  t.is(agent.things[0].state.status, 'busy')
})

test('POST /thing/:id resolves device by mockId', async (t) => {
  const { agent, baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/thing/${agent.things[0].mockId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state: { status: 'offline' } })
  })

  t.is(res.status, 200)
  t.is(agent.things[0].state.status, 'offline')
})

test('POST /thing/:id stops device when offline is true', async (t) => {
  const { agent, baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/thing/device-1`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ offline: true, state: { status: 'ok' } })
  })

  t.is(res.status, 200)
  t.is(agent.things[0].isRunning(), false)
})

test('POST /thing/:id starts device when offline is false', async (t) => {
  const { agent, baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)
  agent.things[0].stop()

  const res = await fetch(`${baseUrl}/thing/device-1`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ offline: false, state: { status: 'ok' } })
  })

  t.is(res.status, 200)
  t.is(agent.things[0].isRunning(), true)
})

test('POST /thing/:id/reset restores initial state', async (t) => {
  const { agent, baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)

  agent.things[0].state.status = 'changed'

  const res = await fetch(`${baseUrl}/thing/device-1/reset`, {
    method: 'POST'
  })

  t.is(res.status, 200)
  t.is(agent.things[0].state.status, 'ok')
})

test('POST /thing/:id returns 404 for unknown device', async (t) => {
  const { baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/thing/missing`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state: { status: 'ok' } })
  })
  const body = await res.json()

  t.is(res.status, 404)
  t.is(body.error, 'thing not found')
})

test('POST /thing/:id/reset returns 404 for unknown device', async (t) => {
  const { baseUrl, close } = await startAgent([{ id: 'device-1' }])
  t.teardown(close)

  const res = await fetch(`${baseUrl}/thing/missing/reset`, {
    method: 'POST'
  })
  const body = await res.json()

  t.is(res.status, 404)
  t.is(body.error, 'thing not found')
})
