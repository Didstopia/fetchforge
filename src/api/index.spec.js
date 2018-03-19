/* eslint-disable no-unused-expressions */
/* global describe, it, beforeEach */

const chai = require('chai')
const expect = chai.expect

const API = require('../api')
const path = require('path')
const promisify = require('util').promisify
const fs = require('fs')
const stat = promisify(fs.stat)
const rimraf = promisify(require('rimraf'))
const mkdirp = require('mkdir-recursive').mkdirSync

describe('App', () => {
  describe('API', () => {
    beforeEach(async () => {
      this.pathOverride = './tmp/fetchforge_unit_test'
      this.realPath = path.resolve(path.normalize(this.pathOverride))
      // console.log('--- REMOVING TEMPORARY DATA ---')
      await rimraf(this.realPath)
      mkdirp(this.realPath)
      // console.log('--- DONE REMOVING TEMPORARY DATA ---')
    })
    it('Test exception handling', () => {
      expect(() => new API()).to.throw(Error)
    })
    it('Test with a valid username', async () => {
      let api = new API('Dids', this.pathOverride)
      let results = await api.loadVideos('', 0, 1, 2)
      expect(results).to.not.be.empty
      expect(results.videos).to.not.be.empty
      expect(results.total).to.be.greaterThan(0)
      try {
        if (await stat(this.realPath)) {
          return
        }
      } catch (e) {
        throw e
      }
    })
    it('Test with an invalid username', async () => {
      let api = new API('asdf', this.pathOverride)
      try {
        await api.loadVideos('', 0, 1, 1)
      } catch (err) {
        return
      }
      throw new Error('An invalid username should have thrown an error')
    })
  })
})
