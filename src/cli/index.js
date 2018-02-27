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
const sanitize = require('sanitize-filename')
const Spinner = require('cli-spinner').Spinner
const ForgeAPI = require('../api')

// Set default spinner style
// Spinner.setDefaultSpinnerString()

const download = async (username) => {
  if (!validator.isAlphanumeric(username)) {
    log.error('Error: Invalid username')
    process.exit(1)
  }

  log.debug('Downloading clips from user:', username)

  // Create and start a new spinner
  let spinner = new Spinner('Warming up.. %s')
  spinner.start()

  let url = 'https://forge.gg/' + username
  await r2(url).response
    .then(response => response.text())
    .then(async body => {
      try {
        spinner.setSpinnerTitle('Listing clips.. %s')
        let userId = body.match(constants.FORGE_USERID_REGEX)[1]
        let api = new ForgeAPI(userId)
        let result = await api.loadVideos()

        // Prepare the download path
        let downloadPath = constants.DOWNLOAD_PATH
        try { await stat(downloadPath) } catch (e) { await mkdir(downloadPath) }

        // Make sure a folder exists per user
        let userPath = path.join(downloadPath, username)
        try { await stat(userPath) } catch (e) { await mkdir(userPath) }

        // TODO: Start downloading each video file to the local filesystem
        for (let i in result.videos) {
          let video = result.videos[i]

          // Make sure a folder exists per game
          let gamePath = path.join(userPath, video.game.slug)
          try { await stat(gamePath) } catch (e) { await mkdir(gamePath) }

          // TODO: Could we potentially set the "creation" dates from the "createdAt" property instead?

          // FIXME: This doesn't seem to properly validate whether the files already exist or not?
          // Create a unique name for the video
          let baseName = sanitize(video.title ? video.title : video.id)
          let thumbnailName = baseName + '.jpg'
          let videoName = baseName + '.mp4'

          spinner.setSpinnerTitle('Processing clip "' + baseName + '" .. %s')

          let thumbnailPath = path.join(gamePath, thumbnailName)
          let videoPath = path.join(gamePath, videoName)
          try {
            if (await stat(thumbnailPath)) {
            // FIXME: Actually generate unique files instead of just bailing out
              spinner.stop(true)
              log.debug('Thumbnail already exists:', thumbnailName)
              spinner.start()
              // process.exit(1)
            }
          } catch (e) {
            // Process the thumbnail
            spinner.stop(true)
            log.debug(`Downloading thumbnail from ${video.thumbnail} to ${thumbnailPath}`)
            spinner.start()
            await r2.get(video.thumbnail).response
              .then(response => response.buffer())
              .then(async buffer => {
                await writeFile(thumbnailPath, buffer)
                spinner.stop(true)
                log.debug('Wrote thumbnail to disk')
                spinner.start()
              })
          }
          try {
            if (await stat(videoPath)) {
            // FIXME: Actually generate unique files instead of just bailing out
              spinner.stop(true)
              log.debug('Video already exists:', videoName)
              spinner.start()
              // process.exit(1)
            }
          } catch (e) {
            // Process the video
            spinner.stop(true)
            log.debug(`Downloading video from ${video.url} to ${videoPath}`)
            spinner.start()
            await r2.get(video.url).response
              .then(response => response.buffer())
              .then(async buffer => {
                await writeFile(videoPath, buffer)
                spinner.stop(true)
                log.debug('Wrote video to disk')
                spinner.start()
              })
          }
        }

        // TODO: Create the proper file and directory structure, so you're taking into consideration
        //       things like the game, author (username), id and title of the clip etc.

        // TODO: If easily possible, create a HTML-file used for viewing the files, as there will be a lot of them..

        spinner.stop(true)

        log.debug('All done!')
        process.exit(0)
      } catch (err) {
        log.error('Error: Failed to download videos\nCheck your username\n')
        log.error(err)
        process.exit(1)
      }
    })
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
