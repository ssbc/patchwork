#! /usr/bin/env node

// load config
var path    = require('path')
var ssbKeys = require('ssb-keys')
var config  = require('ssb-config/inject')(process.env.ssb_appname)
config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if(config.keys.curve === 'k256')
  throw new Error('k256 curves are no longer supported,'+
                  'please delete' + path.join(config.path, 'secret'))
config.trustedServePath = path.join(__dirname, 'ui')
config.userlandServePath = path.join(config.path, 'www')

// per the GPL's recommendation, let ppl know the license
console.log('')
console.log('Patchwork - Copyright (C) 2015-2016 Secure Scuttlebutt Consortium')
console.log('This program comes with ABSOLUTELY NO WARRANTY.')
console.log('This is free software, and you are welcome to redistribute it under certain conditions (GPL-3.0).')
console.log('')
console.log('Starting...')

// start sbot
var sbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/friends'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('scuttlebot/plugins/blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/block'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('scuttlebot/plugins/private'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('ssb-web-server'))
  .use(require('./api'))
  (config)

// write manifest file
var fs = require('fs')
fs.writeFileSync(
  path.join(config.path, 'manifest.json'),
  JSON.stringify(sbot.getManifest(), null, 2)
)

// basic error handling
process.on('uncaughtException', function (e) {
  console.error(e.stack || e.toString())
  process.exit(1)
})

// run electron-specific code, if appropriate
if (process.versions['electron']) {
  require('./electron')()
}