const constants = require('../utils/constants')
const log = require('../utils/log')
const program = require('commander')
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

const CLI = require('clui')
const CLC = require('cli-color')
// const Line = CLI.Line
const Progress = CLI.Progress
const Spinner = CLI.Spinner

const download = async (username) => {
  if (!validator.isAlphanumeric(username)) {
    log.error('Error: Invalid username')
    process.exit(1)
  }

  // Create a spinner
  let spinner = new Spinner('Downloading clips..', ['◜', '◝', '◞', '◟'])

  log.debug('Downloading clips from user:', username)

  let api = new ForgeAPI(username)
  let result = await api.loadVideos()

  // Start the spinner
  spinner.start()

  // Prepare global paths
  let downloadPath = constants.DOWNLOAD_PATH
  let userPath = path.join(downloadPath, username)

  // Start downloading each video file to the local filesystem
  let index = 1 // This is technically not accurate but it does give the user some "inspiration"
  for (let i in result.videos) {
    // Get a reference to the video details
    let video = result.videos[i]

    // Update the spinner
    spinner.message(`Downloading clip ${index} out of ${result.videos.length} (total progress: ${index / result.videos.length * 100}%)`)

    // Make sure the correct folder structure exists
    let gamePath = path.join(userPath, video.game.slug)
    try { await stat(downloadPath) } catch (e) { await mkdir(downloadPath) }
    try { await stat(userPath) } catch (e) { await mkdir(userPath) }
    try { await stat(gamePath) } catch (e) { await mkdir(gamePath) }

    // Create a Date() object from the video creation date string
    let videoCreationDate = new Date(video.createdAt)

    // TODO: Could we potentially set the "creation" dates from the "createdAt" property instead?

    // FIXME: This doesn't seem to properly validate whether the files already exist or not?
    // Create a unique name for the video
    let baseName = sanitize(video.title ? video.title : `Untitled_${video.id}`).replace(/\s/g, '_')
    let thumbnailName = baseName + '.jpg'
    let videoName = baseName + '.mp4'
    let jsonName = baseName + '.json'

    let thumbnailPath = path.join(gamePath, thumbnailName)
    let videoPath = path.join(gamePath, videoName)
    let jsonPath = path.join(gamePath, jsonName)
    try {
      if (await stat(thumbnailPath)) {
        // FIXME: Actually generate unique files instead of just bailing out
        log.debug('Thumbnail already exists:', thumbnailName)
        // process.exit(1)
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
        // FIXME: Actually generate unique files instead of just bailing out
        log.debug('Video already exists:', videoName)
        // process.exit(1)
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
        // FIXME: Actually generate unique files instead of just bailing out
        log.debug('JSON already exists:', jsonName)
        // process.exit(1)
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

  // TODO: Create the proper file and directory structure, so you're taking into consideration
  //       things like the game, author (username), id and title of the clip etc.

  // TODO: If easily possible, create a HTML-file used for viewing the files, as there will be a lot of them..

  // Stop the spinner
  spinner.stop()

  log.debug('All done!')
  process.exit(0)
}

// Custom help override function that adds color support etc.
const programHelpOverride = () => {
  program.outputHelp(output => {
    // Remove duplicate lines (in this case help is printed twice)
    let splitOutput = output.split('\n')
    output = splitOutput.filter((elem, pos) => {
      return elem ? splitOutput.indexOf(elem) === pos : true
    }).join('\n')
    log.help(output)
    process.exit(0)
  })
}

// TODO: We should also support a fully interactive mode,
//       where the app is ran without any arguments and the
//       user is then prompted for any missing values (also ask for optional values?)
program.version(constants.APP_VERSION)
program.usage('[options] <command>\n  Example: fetchforge download Dids')

// TODO: Implement in terms of increased log level etc.
// .option('-v, --verbose', 'A value that can be increased', increaseVerbosity, 0)

// TODO: I'm not really sure if this is a good way to go about it, because arguments might be better, no?
program
  .command('download [username]') // NOTE: <required> [optional]
  // .alias('d')
  .description('Download clips from a specific user')
  // .option('-d, --directory', 'Set a custom download directory', () => {}, '~/') // TODO: Implement at some point
  .action(async (username) => {
    if (!username) {
      prompt({ type: 'input', name: 'username', message: 'Username to download from:' }).then(async (answers) => {
        if (answers['username']) {
          await download(answers.username)
        } else {
          log.error('Error: Username is required')
          process.exit(1)
        }
      })
    } else {
      await download(username)
    }
  })

// HACK: Override help
program.option('-h, --help', 'output usage information', () => {
  programHelpOverride()
})

// FIXME: Doesn't work properly
// Handle unknown options
/* program
.option('*')
.action(option => {
  log.error('')
  log.error('Unknown option:', option)
  log.error('')
}) */

// FIXME: Doesn't work properly
// Handle unknown commands
/* program
.command('*')
.option('-*', '--*')
.action(command => {
  log.error('')
  log.error('Unknown command:', command)
  log.error('')
}) */

// Parse arguments
program.parse(process.argv)

// If running without arguments, show the help
// NOTE: Do this _after_ parsing the arguments
if (!program.args.length) {
  programHelpOverride()
}
