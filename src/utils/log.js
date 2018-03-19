const colors = require('colors')
const constants = require('./constants')

colors.setTheme({
  help: 'cyan',
  debug: 'grey',
  verbose: 'white',
  info: 'green',
  warning: 'yellow',
  error: 'red'
})

module.exports = {
  help (...args) {
    validateSpinner(() => console.log(colors.help(...args)))
  },

  debug (...args) {
    if (constants.IS_DEBUG) {
      validateSpinner(() => console.log(colors.debug(...args)))
    }
  },

  verbose (...args) {
    if (constants.IS_DEBUG || constants.IS_VERBOSE) {
      validateSpinner(() => console.log(colors.verbose(...args)))
    }
  },

  info (...args) {
    validateSpinner(() => console.log(colors.info(...args)))
  },

  warning (...args) {
    validateSpinner(() => console.log(colors.warning(...args)))
  },

  error (...args) {
    validateSpinner(() => console.log(colors.error(...args)))
  }
}

function validateSpinner (func) {
  let isSpinner = constants.Spinner.timer
  if (isSpinner) {
    constants.Spinner.stop()
  }
  func()
  if (isSpinner) {
    constants.Spinner.start()
  }
}
