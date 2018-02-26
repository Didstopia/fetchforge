const constants = require('../utils/constants')
const log = require('../utils/log')

const program = require('commander')
const { prompt } = require('inquirer')

const r2 = require('r2')
const scrapeIt = require('scrape-it')

// TODO: Refactor everything to their own files to separate logic as clearly as possible

const download = async(username) => {
  // TODO: Sanitize username to avoid any further issues (alphanumeric only?)

  log.debug('Downloading clips from user:', username)

  let url = 'https://forge.gg/' + username

  // TODO: Could we potentially parse the React stuff to a JSON object?

  // TODO:
  //
  // 1. Get an array of <div class="item-*">
  // 2. Get item -> <div> -> <a href>
  // 3. Open the link (format: https://forge.gg/Dids/VmlkZW86OTUxNTMy)
  // 4. Get <source src>

  // NOTE: Works
  r2(url).response
  .then(response => response.text())
  .then(body => {
    // log.debug('Body:', body)

    // FIXME: Naturally this doesn't work and scrape-it doesn't seem to support
    //        any fancy waiting/loading of content (scrolled content in this case)
    let result = scrapeIt.scrapeHTML(body, {
      videos: {
        listItem: '.item-*',
        data: {
          url: {
            listItem: 'div > a.href'
          }
        }
      }
    })
    log.debug('Scrape result:', JSON.stringify(result, null, 2))
  })

  // NOTE: Works
  /* let response = await r2(url, {
    headers: {
      'User-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4'
    }
  }).response
  log.debug('Response:', response) */

  // NOTE: Doesn't work
  /* let html = await r2(url, {
    headers: {
      'User-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4'
    }
  }).text
  log.debug('HTML:', html) */

  // NOTE: Doesn't work
  /* await scrapeIt({
    url: url,
    headers: {
      'User-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4'
    }
  }).then(page => {
    log.debug('Page:', page)
  }) */
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
.action(async(username) => {
  // TODO: Come up with a good way to do input validation
  // TODO: Strip whitespaces and potentially any non alphanumeric characters?
  if (!username) {
    prompt({ type: 'input', name: 'username', message: 'Username to download from:' }).then(async(answers) => {
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
