'use strict'

function createMockThingHandlers (initialState = {}) {
  let state = { ...initialState }
  let running = true

  return {
    state,
    start () {
      running = true
    },
    stop () {
      running = false
    },
    reset () {
      state = { ...initialState }
      running = true
      return state
    },
    isRunning () {
      return running
    }
  }
}

module.exports = { createMockThingHandlers }
