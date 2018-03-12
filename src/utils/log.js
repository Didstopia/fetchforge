const colors = require('colors')
const constants = require('./constants')

colors.setTheme({
  help: 'cyan',
  debug: 'grey',
  info: 'green',
  warning: 'yellow',
  error: 'red'
})

module.exports = {
  help (...args) {
    console.log(colors.help(...args))
  },

  debug (...args) {
    if (constants.IS_DEBUG) {
      console.log(colors.debug(...args))
    }
  },

  info (...args) {
    console.log(colors.info(...args))
  },

  warning (...args) {
    console.log(colors.warning(...args))
  },

  error (...args) {
    console.log(colors.error(...args))
  }
}
