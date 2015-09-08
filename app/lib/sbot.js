var fs         = require('fs')
var path       = require('path')
var config     = require('ssb-config/inject')(process.env.ssb_appname)
var ssbKeys    = require('ssb-keys')
var createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/friends'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('scuttlebot/plugins/blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/block'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('scuttlebot/plugins/private'))
  .use(require('ssb-patchwork-api'))

config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if(config.keys.curve === 'k256')
  throw new Error('k256 curves are no longer supported,'+
                  'please delete' + path.join(config.path, 'secret'))

var instance = null

module.exports.setup = function () {
  // start sbot
  instance = createSbot(config)

  // write manifest file
  fs.writeFileSync(
    path.join(config.path, 'manifest.json'),
    JSON.stringify(instance.getManifest(), null, 2)
  )
}

module.exports.get = function () {
  return instance
}