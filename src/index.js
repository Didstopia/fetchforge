#!/usr/bin/env node

// TODO: Replicate the XHR requests in Chrome web tools when scrolling the page,
//       so we can replicate the API calls and call them ourselves, so we're not
//       actually trying to emulate a browser/scrape per se
// A bit more details on this here: https://www.reddit.com/r/HTML/comments/5n82fz/html_scraping_dynamically_on_scroll/

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
