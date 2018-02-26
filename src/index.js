#!/usr/bin/env node

const constants = require('./utils/constants')
const log = require('./utils/log')

// Print simple information when debugging
if (constants.IS_DEBUG) {
  log.debug('')
  log.debug('Environment:', constants.ENVIRONMENT)
  log.debug('Version:', constants.APP_VERSION)
  log.debug('Description:', constants.APP_DESCRIPTION)
  log.debug('')
}

// Handle control to the CLI
require('./cli')
