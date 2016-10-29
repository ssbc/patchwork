#! /usr/bin/env node

// load config
var path    = require('path')
var ssbKeys = require('ssb-keys')
var config  = require('ssb-config/inject')(process.env.ssb_appname)
config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if(config.keys.curve === 'k256')
  throw new Error('k256 curves are no longer supported,'+
                  'please delete' + path.join(config.path, 'secret'))


// run electron-specific code, if appropriate
if (process.versions['electron']) {
  require('./electron')(config)
} else {
  require('./server-process')(config)
}
