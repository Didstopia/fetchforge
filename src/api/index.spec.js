/* eslint-disable no-unused-expressions */
/* global describe, it */

const chai = require('chai')
const expect = chai.expect

const API = require('../api')

describe('App', () => {
  describe('API', () => {
    // Switch to the development environment
    process.env.NODE_ENV = 'development'
    it('Test exception handling', () => {
      expect(() => new API()).to.throw(Error)
    })
    it('Test with a valid username', async () => {
      let api = new API('Dids')
      let results = await api.loadVideos('', 0, 1, 1)
      expect(results).to.not.be.empty
      // TODO: Properly further test the results
    })
    it('Test with an invalid username', () => {
      let api = new API('asdf')
      expect(() => api.loadVideos('', 0, 1, 1)).to.throw(Error)
    })
    it('Test overriding the download path', async () => {
      let api = new API('Dids', '~/Downloads/fetchforge_unit_test')
      let results = await api.loadVideos('', 0, 1, 1)
      expect(results).to.not.be.empty
      // TODO: Test that the custom path above now exists
    })
  })
})
