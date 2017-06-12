var serveBlobs = require('./lib/serve-blobs')
var fs = require('fs')
var Path = require('path')
var electron = require('electron')

var createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('ssb-friends'))
  .use(require('ssb-blobs'))
  .use(require('ssb-backlinks'))
  .use(require('ssb-private'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('ssb-query'))
  .use(require('ssb-about'))
  .use(require('./lib/progress-stream'))

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
