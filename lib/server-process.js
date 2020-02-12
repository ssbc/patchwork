const fs = require('fs')
const Path = require('path')
const electron = require('electron')
const spawn = require('child_process').spawn
const fixPath = require('fix-path')

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
  .use(require('ssb-dht-invite'))
  .use(require('ssb-invite'))
  .use(require('ssb-query'))
  .use(require('ssb-search'))
  .use(require('ssb-ws'))
  .use(require('ssb-tags'))
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
