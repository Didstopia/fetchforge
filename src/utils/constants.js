const pkg = require('../../package.json')
const path = require('path')

module.exports = Object.freeze({
  // Environment constants
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  IS_DEBUG: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
  IS_RELEASE: process.env.NODE_ENV === 'production',

  // App constants
  APP_VERSION: pkg.version,
  APP_DESCRIPTION: pkg.description,

  // Forge constants
  FORGE_BASE: 'https://forge.gg',
  FORGE_API_BASE: 'https://forge.gg/api',
  // FORGE_USERID_REGEX: username => new RegExp(`/(?:.*)"id":"(.*)","username":"${username}"(?:.*)/`)
  FORGE_USERID_REGEX: /(?:.*)\/avatars\/([0-9]+)(?:.*).png/,

  // Platform constants
  DOWNLOAD_PATH: path.join(process.platform === 'win32' ? process.env.HOMEPATH : process.env.HOME, 'Downloads')
})
