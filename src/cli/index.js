const constants = require('../utils/constants')
const log = require('../utils/log')
const { prompt } = require('inquirer')
const r2 = require('r2')
const validator = require('validator')
const fs = require('fs')
const path = require('path')
const promisify = require('util').promisify
const stat = promisify(fs.stat)
const writeFile = promisify(fs.writeFile)
const utimes = promisify(fs.utimes)
const sanitize = require('sanitize-filename')
const mkdirp = require('mkdir-recursive').mkdirSync
const ForgeAPI = require('../api')
const moment = require('moment')

// Create a new CLI class
class CLI {
  constructor () {
    this.pathOverride = undefined
  }

  async handleArgs (args) {
    return new Promise(async (resolve, reject) => {
      log.debug('handleArgs:', JSON.stringify(args, null, 2))

      // Parse normalized arguments
      if (args.length) {
        // Enable verbose mode
        if (args.includes('-v') || args.includes('--verbose')) {
          // Switch to the verbose environment
          process.env.NODE_ENV = 'verbose'

          // Remove the verbose arguments, as we don't need them anymore
          if (args.indexOf('-v') !== -1) args.splice(args.indexOf('-v'), 1)
          if (args.indexOf('--verbose') !== -1) args.splice(args.indexOf('--verbose'), 1)
        }

        // Print version information
        if (args.includes('-V') || args.includes('--version')) {
          let log = require('../utils/log')
          let constants = require('../utils/constants')
          let figlet = require('figlet')
          log.info('')
          log.info(figlet.textSync('FETCHFORGE'))
          log.help('')
          log.help(`  fetchforge ${constants.APP_VERSION}`)
          log.help('')
          return resolve()
          // process.exit(0)
        }

        // Print command line usage instructions
        if (args.includes('-h') || args.includes('--help')) {
          let log = require('../utils/log')
          let figlet = require('figlet')
          log.info('')
          log.info(figlet.textSync('FETCHFORGE'))
          log.help('')
          log.help('  Usage: fetchforge [username]')
          log.help('')
          log.help('  Options:')
          log.help('    -p / --path (override download path)')
          log.help('    -h / --help (show this help screen')
          log.help('    -v / --verbose (enable verbose logging)')
          log.help('    -V / --version (show version information)')
          log.help('')
          return resolve()
          // process.exit(0)
        }
      }

      this.pathOverride = constants.IS_TEST ? path.resolve(path.normalize('./tmp/fetchforge_unit_test')) : undefined
      if (args.includes('-p') || args.includes('--path')) {
        this.pathOverride = args[args.indexOf('-p') !== -1 ? args.indexOf('-p') + 1 : args.indexOf('--path') + 1]

        // Validate the extra path argument
        if (!this.pathOverride) {
          return reject(new Error('Missing path (path argument requires a path)'))
        }

        // Normalize and resolve the path
        log.debug('Path override:', this.pathOverride)
        this.pathOverride = path.normalize(this.pathOverride)
        log.debug('Path override (normalized):', this.pathOverride)
        this.pathOverride = path.resolve(this.pathOverride)
        log.debug('Path override (resolved):', this.pathOverride)

        // Validate the extra path argument again
        if (!this.pathOverride) {
          return reject(new Error('Missing path (path argument requires a path)'))
        }

        // Validate that the path exists
        try {
          if (await stat(this.pathOverride)) {
            log.debug('Override path exists, continuing..')
          }
        } catch (e) {
          return reject(new Error('Invalid path specified (make sure it exists first)'))
        }

        // Remove the path arguments, as we don't need them anymore
        if (args.indexOf('-p') !== -1) args.splice(args.indexOf('-p'), 2)
        if (args.indexOf('--path') !== -1) args.splice(args.indexOf('--path'), 2)
      }

      // Handle different arguments
      if (args.length === 1) {
        // If we have exactly 1 argument, we can use that as the username
        log.debug('Enabling non-interactive mode')
        resolve(await this.download(args[0], this.pathOverride))
      } else if (args.length > 1) {
        // If we have more than 1 argument, we just bail out
        return reject(new Error('Too many arguments'))
      } else {
        // If there are no arguments, we enable interactive mode
        log.debug('Enabling interactive mode')
        resolve(await this.promptForUser()
          .catch(err => {
            return reject(err)
          }))
      }
    })
  }

  async download (username, pathOverride) {
    return new Promise(async (resolve, reject) => {
      if (!validator.isAlphanumeric(username)) {
        return reject(new Error('Username is invalid or missing'))
      }

      if (!pathOverride) {
        pathOverride = constants.IS_TEST ? path.resolve(path.normalize('./tmp/fetchforge_unit_test')) : undefined
      }

      // Create a spinner
      let spinner = constants.Spinner

      log.debug('Downloading clips from user:', username)

      // Keep track of the start time
      let startTime = process.hrtime()

      let api = new ForgeAPI(username, pathOverride)
      let args = constants.IS_TEST ? ['', 0, 1, 2] : []

      await api.loadVideos(...args)
        .then(async result => {
          log.debug(`Got a list of ${result.videos.length}/${result.total} videos!`)

          let apiListExecTime = this.parseHrtimeToSeconds(process.hrtime(startTime))
          log.debug(`Listing videos took ${apiListExecTime} seconds!`)

          // Start the spinner
          spinner.start()

          // Prepare global paths
          let downloadPath = path.join(pathOverride || constants.DOWNLOAD_PATH, 'fetchforge')
          let userPath = path.join(downloadPath, username)

          log.debug('Base download path:', downloadPath)

          // Store the download start time in milliseconds, used to calculate the ETA
          let downloadStartTime = new Date().getTime()

          // Start downloading each video file to the local filesystem
          let index = 1 // This is technically not accurate but it does give the user some "inspiration"
          let skipIndex = 0 // This keeps track of skipped clips

          // Create a function for updating the spinner
          let spinnerText = ''
          let updateFunc = (time, count, total, skip) => {
          // Calculate the ETA and update the spinner
            let elapsedTime = (new Date().getTime()) - time
            let chunksPerTime = (count - skip) / elapsedTime
            let estimatedTotalTime = (total - skip) / chunksPerTime
            let timeLeftInSeconds = (estimatedTotalTime - elapsedTime) / 1000
            let withOneDecimalPlace = Math.round(timeLeftInSeconds * 10) / 10
            if (isNaN(withOneDecimalPlace)) {
              withOneDecimalPlace = 0
            }
            let newSpinnerText = `Downloading clip ${count} out of ${total} (${parseInt(count / total * 100)}%) - ${moment.duration(withOneDecimalPlace, 'seconds').humanize()} left`
            let needsClearing = newSpinnerText.length < spinnerText.length
            spinnerText = newSpinnerText
            if (needsClearing) spinner.stop()
            spinner.message(spinnerText)
            if (needsClearing) spinner.start()
          }

          // Create a new timer for updating the spinner and ETA
          let updateTimer = setInterval(() => {
            updateFunc(downloadStartTime, index, result.videos.length, skipIndex)
          }, 5000)

          for (let i in result.videos) {
          // Get a reference to the video details
            let video = result.videos[i]

            // Update the spinner
            updateFunc(downloadStartTime, index, result.videos.length, skipIndex)

            // Make sure the correct folder structure exists
            let gamePath = path.join(userPath, video.game.slug)
            // mkdirp(downloadPath)
            // mkdirp(userPath)
            mkdirp(gamePath)

            // Create a Date object from the video creation date string
            let videoCreationDate = new Date(video.createdAt)

            // Create unique and sanitized filenames for all of the data
            let baseName = sanitize(video.title ? `${video.title}_${video.id}` : `Untitled_${video.id}`)
              .replace(/\s/g, '_') // Replace spaces with underscors
              .replace(/[^a-z0-9_]/gi, '') // Remove disallowed characters
            let thumbnailName = baseName + '.jpg'
            let videoName = baseName + '.mp4'
            let jsonName = baseName + '.json'

            let thumbnailPath = path.join(gamePath, thumbnailName)
            let videoPath = path.join(gamePath, videoName)
            let jsonPath = path.join(gamePath, jsonName)
            try {
              if (await stat(thumbnailPath)) {
                log.debug('Thumbnail already exists (skipping):', thumbnailName)
              }
            } catch (e) {
            // Process the thumbnail
              log.debug(`Downloading thumbnail from ${video.thumbnail} to ${thumbnailPath}`)
              await r2.get(video.thumbnail).response
                .then(response => response.buffer())
                .then(async buffer => {
                  await writeFile(thumbnailPath, buffer)
                  await utimes(thumbnailPath, videoCreationDate, videoCreationDate)
                  log.debug('Wrote thumbnail to disk:', thumbnailName)
                })
            }
            try {
              if (await stat(videoPath)) {
                log.debug('Video already exists (skipping):', videoName)

                // Increment the skip index, so our ETA calculation knows about it
                skipIndex++

                // Reset the download start time
                downloadStartTime = new Date().getTime()
              }
            } catch (e) {
            // Process the video
              log.debug(`Downloading video from ${video.url} to ${videoPath}`)
              await r2.get(video.url).response
                .then(response => response.buffer())
                .then(async buffer => {
                  await writeFile(videoPath, buffer)
                  await utimes(videoPath, videoCreationDate, videoCreationDate)
                  log.debug('Wrote video to disk:', videoName)
                })
            }
            try {
              if (await stat(jsonPath)) {
                log.debug('JSON already exists (skipping):', jsonPath)
              }
            } catch (e) {
            // Process the JSON
              await writeFile(jsonPath, JSON.stringify(video, null, 2))
              await utimes(jsonPath, videoCreationDate, videoCreationDate)
              log.debug('Wrote JSON to disk:', jsonName)
            }

            // Increment the index
            index++
          }

          // Stop the timer
          clearInterval(updateTimer)

          // Stop the spinner
          spinner.stop()

          log.debug('All done!')
          return resolve()
          // process.exit(0)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  promptForUser () {
    return new Promise(async (resolve, reject) => {
      prompt({ type: 'input', name: 'username', message: 'Username to download from:' }).then(async (answers) => {
        if (answers['username'] && validator.isAlphanumeric(answers['username'])) {
          resolve(await this.download(answers.username))
        } else {
          reject(new Error('Username is invalid or missing'))
          // process.exit(1)
        }
      })
    })
  }

  parseHrtimeToSeconds (hrtime) {
    let seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3)
    return seconds
  }
}

// Export the class itself
module.exports = CLI
