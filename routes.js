'use strict'

const mingo = require('mingo')
const debug = require('debug')('mock')

const findDevice = (request) => {
  const { params: { id }, ctx: { things } } = request

  return things?.find(device => device.id === id || device.mockId === id)
}

const routes = {
  '/things': {
    get: async (req, res) => {
      const query = JSON.parse(req.query.q || '{}')
      const cursor = mingo.find(req.ctx.things, query)
      const things = cursor.all()
      res.send(things)
    }
  },
  '/thing/:id': {
    post: async (req, res) => {
      const device = findDevice(req)

      if (device) {
        if (req.body.offline) {
          device.stop()
        } else {
          device.start()
        }
        delete req.body.offline

        // update thing state with the req.body.state saving the same object reference
        Object.assign(device.state, JSON.parse(req.body)?.state)

        debug('device.state', device.state)
      } else {
        res.status(404).send({
          error: 'thing not found'
        })
      }
    }
  },
  '/thing/:id/reset': {
    post: async (req, res) => {
      const device = findDevice(req)

      if (device) {
        device.state = device.reset()
        debug('device.state reset', device.state)
      } else {
        res.status(404).send({
          error: 'thing not found'
        })
      }
    }
  }
}

module.exports = routes
