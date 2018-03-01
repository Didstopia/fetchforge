/*
   A simple wrapper for pkg, so we can easily pass
   NODE_ENV to the application itself
*/

process.env.NODE_ENV = 'production'
require('./src')
