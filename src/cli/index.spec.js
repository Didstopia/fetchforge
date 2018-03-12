/* eslint-disable no-unused-expressions */
/* global describe, it, beforeEach */

const chai = require('chai')
const expect = chai.expect

const CLI = require('../cli')
const path = require('path')
const promisify = require('util').promisify
const fs = require('fs')
const stat = promisify(fs.stat)
const rimraf = promisify(require('rimraf'))
const mkdirp = require('mkdir-recursive').mkdirSync

describe('App', () => {
  describe('CLI', () => {
    beforeEach(async () => {
      // console.log('Test begin..')
      this.pathOverride = './tmp/fetchforge_unit_test'
      this.realPath = path.resolve(path.normalize(this.pathOverride))
      console.log('--- REMOVING TEMPORARY DATA ---')
      await rimraf(this.realPath)
      mkdirp(this.realPath)
      console.log('--- DONE REMOVING TEMPORARY DATA ---')
    })
    describe('Test arguments', () => {
      it('-v', () => {
        let cli = new CLI()
        cli.isUnitTest = true
        cli.handleArgs(['-v'])
        expect(process.env.NODE_ENV).equal('verbose')
      })
      it('-verbose', () => {
        let cli = new CLI()
        cli.isUnitTest = true
        cli.handleArgs(['--verbose'])
        expect(process.env.NODE_ENV).equal('verbose')
      })
      it('-p (without path)', async () => {
        let cli = new CLI()
        cli.isUnitTest = true
        await cli.handleArgs(['-p'])
          .then(() => {
            throw new Error('Missing path argument should throw an error')
          })
          .catch(err => {
            expect(err).to.be.an.instanceof(Error)
          })
        await cli.handleArgs(['-p', 'Dids'])
          .then(() => {
            throw new Error('Missing path argument should throw an error')
          })
          .catch(err => {
            expect(err).to.be.an.instanceof(Error)
          })
      })
      it('-p (with path)', async () => {
        let cli = new CLI()
        cli.isUnitTest = true
        await cli.handleArgs(['-p', this.realPath, 'Dids'])
        expect(cli.pathOverride).to.be.equals(this.realPath)
      })
      it('--path (without path)', async () => {
        let cli = new CLI()
        cli.isUnitTest = true
        await cli.handleArgs(['--path'])
          .then(() => {
            throw new Error('Missing path argument should throw an error')
          })
          .catch(err => {
            expect(err).to.be.an.instanceof(Error)
          })
        await cli.handleArgs(['--path', 'Dids'])
          .then(() => {
            throw new Error('Missing path argument should throw an error')
          })
          .catch(err => {
            expect(err).to.be.an.instanceof(Error)
          })
      })
      it('--path (with path)', async () => {
        let cli = new CLI()
        cli.isUnitTest = true
        await cli.handleArgs(['--path', this.realPath, 'Dids'])
        expect(cli.pathOverride).to.be.equals(this.realPath)
      })
    })
    it('Test parseHrtimeToSeconds()', () => {
      let cli = new CLI()
      cli.isUnitTest = true
      let startTime = process.hrtime()
      setTimeout(() => {
        let endTime = cli.parseHrtimeToSeconds(process.hrtime(startTime))
        expect(parseFloat(endTime)).to.be.greaterThan(0, `${endTime} is not greater than 0`)
      }, 100)
    })
    it('Test promptForUser() with an empty username', async () => {
      let cli = new CLI()
      cli.isUnitTest = true
      let stdin = require('mock-stdin').stdin()
      process.nextTick(() => {
        stdin.send(' ')
        stdin.end()
      })
      try {
        await cli.promptForUser()
      } catch (err) {
        return
      }
      throw new Error('Entering an empty username should have thrown an error')
    })
    it('Test promptForUser() with a valid username', async () => {
      let cli = new CLI()
      cli.isUnitTest = true
      let stdin = require('mock-stdin').stdin()
      process.nextTick(() => {
        stdin.send('Dids')
        stdin.end()
      })
      try {
        await cli.promptForUser()
      } catch (err) {
        throw err
      }
    })
    it('Test download() twice', async () => {
      let cli = new CLI()
      cli.isUnitTest = true
      try {
        await cli.download('Dids')
        await cli.download('Dids')
        if (await stat(this.realPath)) {
          return
        }
      } catch (e) {
        throw e
      }
    })
  })
})
