/* eslint-disable no-unused-expressions */
/* global describe, it */

const assert = require('assert')
const sinon = require('sinon')
const log = require('../utils/log')
const colors = require('colors')

describe('App', () => {
  describe('Log', () => {
    it('Test different log levels', () => {
      let testLogLevel = (level, line) => {
        let spy = sinon.spy(console, 'log')
        log[level](line)
        assert(spy.calledWith(colors[level](line)), `log.${level}(${line})`)
        spy.restore()
      }
      let line = 'Hello from Mocha'
      testLogLevel('help', line)
      testLogLevel('debug', line)
      testLogLevel('verbose', line)
      testLogLevel('info', line)
      testLogLevel('warning', line)
      testLogLevel('error', line)
    })
  })
})
