const constants = require('../utils/constants')
const log = require('../utils/log')
const program = require('commander')
const { prompt } = require('inquirer')
const r2 = require('r2')
const ForgeAPI = require('../api')

const download = async (username) => {
  log.debug('Downloading clips from user:', username)
  let url = 'https://forge.gg/' + username
  await r2(url).response
    .then(response => response.text())
    .then(async body => {
      try {
        let userId = body.match(constants.FORGE_USERID_REGEX)[1]
        let api = new ForgeAPI(userId)
        let result = await api.loadVideos()

        // TODO: Start downloading each video file to the local filesystem
        for (let i in result.videos) {
          let video = result.videos[i]
          log.debug(`Downloading from ${video.url} to <TODO>`)
        }

        // TODO: Create the proper file and directory structure, so you're taking into consideration
        //       things like the game, author (username), id and title of the clip etc.

        // TODO: If easily possible, create a HTML-file used for viewing the files, as there will be a lot of them..

        log.debug('All done!')
        process.exit(0)
      } catch (err) {
        log.error('Failed to download videos. Double-check your username and capitalization.\n')
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
program.usage('[options] <user>')

// TODO: Implement in terms of increased log level etc.
// .option('-v, --verbose', 'A value that can be increased', increaseVerbosity, 0)

// TODO: I'm not really sure if this is a good way to go about it, because arguments might be better, no?
program
  .command('download [username]') // NOTE: <required> [optional]
// .alias('d')
  .description('Download clips from a specific user')
  .action(async (username) => {
  // TODO: Come up with a good way to do input validation
  // TODO: Strip whitespaces and potentially any non alphanumeric characters?
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
