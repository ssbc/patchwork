// load config
var path    = require('path')
var ssbKeys = require('ssb-keys')
var config  = require('ssb-config/inject')(process.env.ssb_appname)
config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if(config.keys.curve === 'k256')
  throw new Error('k256 curves are no longer supported,'+
                  'please delete' + path.join(config.path, 'secret'))

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
var httpStack = require('./http-server')
http.createServer(httpStack.AppStack(sbot, { uiPath: path.join(__dirname, 'ui') })).listen(7777)
var ws = require('pull-ws-server')
ws.createServer(require('./ws-server')(sbot)).listen(7778)