const pkg = require('../../package.json')

module.exports = Object.freeze({
  // Environment constants
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  IS_DEBUG: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
  IS_RELEASE: process.env.NODE_ENV === 'production',

  // App constants
  APP_VERSION: pkg.version,
  APP_DESCRIPTION: pkg.description
})
