const fs = require('fs')
const Path = require('path')
const electron = require('electron')
const spawn = require('child_process').spawn
const fixPath = require('fix-path')
// var DHT = require('multiserver-dht')

// removing DHT invites until they work in sbot@13
//
// function dhtTransport (sbot) {
//   sbot.multiserver.transport({
//     name: 'dht',
//     create: dhtConfig => {
//       return DHT({
//         keys: sbot.dhtInvite.channels(),
//         port: dhtConfig.por t
//       })
//     }
//   })
// }

const createSbot = require('secret-stack')()
  .use(require('ssb-db'))
  .use(require('ssb-conn'))
  .use(require('ssb-lan'))
  .use(require('ssb-logging'))
  .use(require('ssb-master'))
  .use(require('ssb-no-auth'))
  .use(require('ssb-replicate'))
  .use(require('ssb-unix-socket'))
  .use(require('ssb-friends')) // not strictly required, but helps ssb-conn a lot
  .use(require('ssb-blobs'))
  .use(require('ssb-backlinks'))
  .use(require('ssb-about'))
  .use(require('ssb-private'))
  .use(require('ssb-room/tunnel/client'))
  // .use(require('ssb-dht-invite')) // this one must come before dhtTransport
  // .use(dhtTransport)
  .use(require('ssb-invite'))
  .use(require('ssb-query'))
  .use(require('ssb-search'))
  .use(require('ssb-ws'))
  .use(require('ssb-tags'))
  .use(require('ssb-friends'))
  .use(require('ssb-device-address'))
  .use(require('ssb-identities'))
  .use(require('ssb-peer-invites'))
  .use(require('ssb-ebt'))
  .use(require('./plugins'))

fixPath()

module.exports = function (ssbConfig) {
  const context = {
    sbot: createSbot(ssbConfig),
    config: ssbConfig
  }
  ssbConfig.manifest = context.sbot.getManifest()
  fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))
  electron.ipcRenderer.send('server-started', ssbConfig)

  // start dht invite support
  // context.sbot.dhtInvite.start()

  // check if we are using a custom ssb path (which would break git-ssb-web)
  if (!ssbConfig.customPath) {
    // attempt to run git-ssb if it is installed and in path
    const gitSsb = spawn('git-ssb', ['web'], {
      stdio: 'inherit'
    })
    gitSsb.on('error', () => {
      console.log('git-ssb is not installed, or not available in path')
    })
    process.on('exit', () => {
      gitSsb.kill()
    })
  }
}
