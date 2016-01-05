#! /usr/bin/env node

// load config
var path    = require('path')
var ssbKeys = require('ssb-keys')
var config  = require('ssb-config/inject')(process.env.ssb_appname)
config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if(config.keys.curve === 'k256')
  throw new Error('k256 curves are no longer supported,'+
                  'please delete' + path.join(config.path, 'secret'))

// validate the config
var configOracle = require('./config')(config)
if (configOracle.hasError()) {
  if (configOracle.allowUnsafe())
    console.log('\nIgnoring unsafe configuration due to --unsafe flag.')
  else {
    console.log('\nAborted due to unsafe config. Run again with --unsafe to override.')
    return
  }
}
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
  .use(require('./api'))
  (config)

// write manifest file
var fs = require('fs')
fs.writeFileSync(
  path.join(config.path, 'manifest.json'),
  JSON.stringify(sbot.getManifest(), null, 2)
)

// setup server
var http = require('http')
var https = require('https')
var ws = require('pull-ws-server')
var httpStack = require('./http-server')
var httpServerFn = httpStack.AppStack(sbot, { uiPath: path.join(__dirname, 'ui') }, configOracle)
var wsServerFn = require('./ws-server')(sbot)

if (configOracle.useTLS()) {
  var tlsOpts = configOracle.getTLS()
  https.createServer(tlsOpts, httpServerFn).listen(7777)
  ws.createServer(tlsOpts, wsServerFn).listen(7778)
  console.log('Serving at https://localhost:7777')
} else {
  http.createServer(httpServerFn).listen(7777)
  ws.createServer(wsServerFn).listen(7778)
  console.log('Serving at http://localhost:7777')
}