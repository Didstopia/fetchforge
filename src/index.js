#!/usr/bin/env node

// Load dotenv
require('dotenv').config()

// Require dependencies
const constants = require('./utils/constants')
const log = require('./utils/log')
const CLI = require('./cli')
const figlet = require('figlet')
const Raven = require('raven')

// Setup graceful shutdown
const shutdown = () => {
  log.info('')
  log.info('Exiting..')
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Setup error reporting
Raven.config(process.env.SENTRY_URL, {
  release: constants.APP_VERSION,
  environment: constants.ENVIRONMENT,
  shouldSendCallback: () => constants.IS_RELEASE,
  autoBreadcrumbs: true
}).install()

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
    constants.Spinner.stop()
    process.exit(0)
  })
  .catch(err => {
    // All errors should bubble up here, so only report them here
    Raven.captureException(err)
    log.error(err)
    process.exit(1)
  })
