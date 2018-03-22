const pkg = require('../../package.json')
const path = require('path')
const os = require('os')
const Spinner = require('clui').Spinner

module.exports = Object.freeze({
  // Environment constants
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  IS_DEBUG: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
  IS_VERBOSE: process.env.NODE_ENV === 'verbose',
  IS_TEST: process.env.NODE_ENV === 'test',
  IS_RELEASE: process.env.NODE_ENV === 'production',

  // App constants
  APP_VERSION: pkg.version,
  APP_DESCRIPTION: pkg.description,

  // Forge constants
  FORGE_BASE: 'https://forge.gg',
  FORGE_API_BASE: 'https://forge.gg/api',
  FORGE_USERID_REGEX: /(?:.*)\/avatars\/([0-9]+)(?:.*).png/,

  // Platform constants
  DOWNLOAD_PATH: path.join(os.homedir(), 'Downloads'),

  // Spinner
  Spinner: process.env.NODE_ENV === 'test' ? {
    start: () => {},
    stop: () => {},
    message: () => {}
  } : new Spinner('Listing clips..', ['◜', '◝', '◞', '◟'])
})
