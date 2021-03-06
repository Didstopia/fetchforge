#!/usr/bin/env node

// Load dotenv (zeit's pkg specific path logic)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

// Switch to verbose mode as early as possible
let args = process.argv.slice(2)
if ((args.includes('-v') || args.includes('--verbose')) && process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'verbose'
}

// Require dependencies
// const path = require('path')
// const os = require('os')
const constants = require('./utils/constants')
const log = require('./utils/log')
const CLI = require('./cli')
const figlet = require('figlet')
const Raven = require('raven')
// const Countly = require('countly-sdk-nodejs')

// Setup graceful shutdown
const shutdown = () => {
  log.info('')
  log.info('Exiting..')
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Production specific setup
if (constants.IS_RELEASE) {
  // Setup error reporting
  Raven.config(process.env.SENTRY_URL, {
    release: constants.APP_VERSION,
    environment: constants.ENVIRONMENT,
    shouldSendCallback: () => constants.IS_RELEASE,
    autoBreadcrumbs: true
  }).install()

  /* // Setup analytics
  Countly.init({
    app_key: process.env.COUNTLY_APP_KEY,
    url: process.env.COUNTLY_URL,
    storage_path: path.join(os.tmpdir(), 'countly-sdk-nodejs')
  })
  Countly.begin_session() */
}

// Print the fetchforge banner
log.info('')
log.info(figlet.textSync('FETCHFORGE'))
log.info('')

// Print extra information when debugging
if (constants.IS_DEBUG) {
  log.debug('Environment:', constants.ENVIRONMENT)
  log.debug('Version:', constants.APP_VERSION)
  log.debug('Description:', constants.APP_DESCRIPTION)
  log.debug('')
}

// Hand over control to the CLI
let cli = new CLI()
cli.handleArgs(process.argv.slice(2))
  .then(() => {
    pressAnyKeyHandler(0)
  })
  .catch(err => {
    // All errors should bubble up here, so only report them here
    Raven.captureException(err)
    log.error(err)
    pressAnyKeyHandler(1)
  })

const pressAnyKeyHandler = (exitCode = 0) => {
  constants.Spinner.stop()
  log.warning('')
  log.warning('Press any key to exit..')
  // log.warning('')
  constants.Spinner.stop()
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', process.exit.bind(process, exitCode))
}
