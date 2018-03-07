#!/usr/bin/env node

// Parse normalized arguments
let args = process.argv.slice(2)
if (args.length) {
  // Enable verbose mode
  if (args.includes('-v') || args.includes('--verbose')) {
    // Switch to the development environment
    process.env.NODE_ENV = 'development'

    // Remove the verbose arguments, as we don't need them anymore
    if (args.indexOf('-v') !== -1) args.splice(args.indexOf('-v'), 1)
    if (args.indexOf('--verbose') !== -1) args.splice(args.indexOf('--verbose'), 1)
  }

  // Print version information
  if (args.includes('-V') || args.includes('--version')) {
    let log = require('./utils/log')
    let constants = require('./utils/constants')
    let figlet = require('figlet')
    log.info('')
    log.info(figlet.textSync('FETCHFORGE'))
    log.help('')
    log.help(`  fetchforge ${constants.APP_VERSION}`)
    log.help('')
    process.exit(0)
  }

  // Print command line usage instructions
  if (args.includes('-h') || args.includes('--help')) {
    let log = require('./utils/log')
    let figlet = require('figlet')
    log.info('')
    log.info(figlet.textSync('FETCHFORGE'))
    log.help('')
    log.help('  Usage: fetchforge [username]')
    log.help('')
    log.help('  Options:')
    log.help('    -h / --help (show this help screen')
    log.help('    -v / --verbose (enable verbose logging)')
    log.help('    -V / --version (show version information)')
    log.help('')
    process.exit(0)
  }
}

// Require dependencies
const constants = require('./utils/constants')
const log = require('./utils/log')
const CLI = require('./cli')
const figlet = require('figlet')

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
cli.handleArgs(args)
