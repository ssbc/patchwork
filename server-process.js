var serveBlobs = require('./lib/serve-blobs')
var fs = require('fs')
var Path = require('path')
var electron = require('electron')

var createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('./lib/persistent-gossip')) // override
  .use(require('scuttlebot/plugins/friends'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('ssb-blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/block'))
  .use(require('./lib/local-with-list'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('scuttlebot/plugins/private'))
  .use(require('ssb-links'))
  .use(require('ssb-query'))

module.exports = function (ssbConfig) {
  var context = {
    sbot: createSbot(ssbConfig),
    config: ssbConfig
  }
  ssbConfig.manifest = context.sbot.getManifest()
  serveBlobs(context)
  fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))
  electron.ipcRenderer.send('server-started', ssbConfig)
}
