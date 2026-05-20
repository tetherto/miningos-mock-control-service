'use strict'

const test = require('brittle')
const MockControlAgent = require('../../mock-control-agent')

test('generateId returns a 32-character hex string', (t) => {
  const agent = new MockControlAgent({ thgs: [] })
  const id = agent.generateId()

  t.is(id.length, 32)
  t.ok(/^[0-9a-f]+$/.test(id))
})

test('init registers things with mockId and mock server handlers', async (t) => {
  const runMockServer = async (thing) => ({
    state: { value: thing.id },
    start: () => {},
    stop: () => {},
    reset: () => ({ value: thing.id })
  })

  const agent = new MockControlAgent({
    thgs: [{ id: 'device-a' }, { id: 'device-b' }]
  })

  await agent.init(runMockServer)

  t.is(agent.things.length, 2)
  t.is(agent.things[0].id, 'device-a')
  t.is(agent.things[1].id, 'device-b')
  t.is(typeof agent.things[0].mockId, 'string')
  t.not(agent.things[0].mockId, agent.things[1].mockId)
  t.is(agent.things[0].state.value, 'device-a')
})

test('runMockDataEditServer skips listen when port is omitted', async (t) => {
  const agent = new MockControlAgent({ thgs: [] })
  await agent.init(async () => ({}))

  t.absent(agent.server)
})
