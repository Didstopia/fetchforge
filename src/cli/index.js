const constants = require('../utils/constants')
const log = require('../utils/log')
const { prompt } = require('inquirer')
const r2 = require('r2')
const validator = require('validator')
const fs = require('fs')
const path = require('path')
const promisify = require('util').promisify
const stat = promisify(fs.stat)
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const utimes = promisify(fs.utimes)
const sanitize = require('sanitize-filename')
const ForgeAPI = require('../api')

const clui = require('clui')
const Spinner = clui.Spinner

// Create a new CLI class
class CLI {
  constructor () {
    log.debug('New CLI class created')
  }

  async handleArgs (args) {
    log.debug('handleArgs:', JSON.stringify(args, null, 2))

    // FIXME: We need to properly test against edgecases,
    //        where users might be doing arguments in random order..

    let pathOverride
    if (args.includes('-p') || args.includes('--path')) {
      pathOverride = args[args.indexOf('-p') !== -1 ? args.indexOf('-p') + 1 : args.indexOf('--path') + 1]

      // Normalize and resolve the path
      log.debug('Path override:', pathOverride)
      pathOverride = path.normalize(pathOverride)
      log.debug('Path override (normalized):', pathOverride)
      pathOverride = path.resolve(pathOverride)
      log.debug('Path override (resolved):', pathOverride)

      // Validate the extra path argument
      if (!pathOverride) {
        log.error('Error: Missing path (path argument requires a path)')
        process.exit(1)
      }

      // Validate that the path exists
      try {
        if (await stat(pathOverride)) {
          log.debug('Override path exists, continuing..')
        }
      } catch (e) {
        log.error('Error: Invalid path specified (make sure it exists first)')
        process.exit(1)
      }

      // Remove the path arguments, as we don't need them anymore
      if (args.indexOf('-p') !== -1) args.splice(args.indexOf('-p'), 2)
      if (args.indexOf('--path') !== -1) args.splice(args.indexOf('--path'), 2)
    }

    // Handle different arguments
    if (args.length === 1) {
      // If we have exactly 1 argument, we can use that as the username
      log.debug('Enabling non-interactive mode')
      await download(args[0], pathOverride)
    } else if (args.length > 1) {
      // If we have more than 1 argument, we just bail out
      log.error('Error: Too many arguments')
      log.error(JSON.stringify(args, null, 2))
      process.exit(1)
    } else {
      // If there are no arguments, we enable interactive mode
      log.debug('Enabling interactive mode')
      await promptForUser()
    }
  }
}

// Export the class itself
module.exports = CLI

const download = async (username, pathOverride) => {
  if (!validator.isAlphanumeric(username)) {
    log.error('Error: Invalid username')
    process.exit(1)
  }

  // Create a spinner
  let spinner = new Spinner('Downloading clips..', ['◜', '◝', '◞', '◟'])

  log.debug('Downloading clips from user:', username)

  // Keep track of the start time
  let startTime = process.hrtime()

  let parseHrtimeToSeconds = hrtime => {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3)
    return seconds
  }

  let api = new ForgeAPI(username)
  let result = await api.loadVideos()

  log.debug(`Got a list of ${result.videos.length}/${result.total} videos!`)

  let apiListExecTime = parseHrtimeToSeconds(process.hrtime(startTime))
  log.debug(`Listing videos took ${apiListExecTime} seconds!`)

  // Start the spinner
  spinner.start()

  // Prepare global paths
  let downloadPath = path.join(pathOverride || constants.DOWNLOAD_PATH, 'fetchforge')
  let userPath = path.join(downloadPath, username)

  log.debug('Base download path:', downloadPath)

  // Start downloading each video file to the local filesystem
  let index = 1 // This is technically not accurate but it does give the user some "inspiration"
  for (let i in result.videos) {
    // Get a reference to the video details
    let video = result.videos[i]

    // Update the spinner
    spinner.message(`Downloading clip ${index} out of ${result.videos.length} (total progress: ${parseInt(index / result.videos.length * 100)}%)`)

    // Make sure the correct folder structure exists
    let gamePath = path.join(userPath, video.game.slug)
    try { await stat(downloadPath) } catch (e) { await mkdir(downloadPath) }
    try { await stat(userPath) } catch (e) { await mkdir(userPath) }
    try { await stat(gamePath) } catch (e) { await mkdir(gamePath) }

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
        log.debug('JSON already exists (skipping):', jsonName)
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

  // Stop the spinner
  spinner.stop()

  log.debug('All done!')
  process.exit(0)
}

const promptForUser = () => {
  prompt({ type: 'input', name: 'username', message: 'Username to download from:' }).then(async (answers) => {
    if (answers['username']) {
      await download(answers.username)
    } else {
      log.error('Error: Username is required')
      process.exit(1)
    }
  })
}
