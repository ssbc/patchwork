var Path = require('path')
var ssbKeys = require('ssb-keys')

var ssbConfig = require('ssb-config/inject')('ssb', {
  port: 8008,
  blobsPort: 7777
})

ssbConfig.keys = ssbKeys.loadOrCreateSync(Path.join(ssbConfig.path, 'secret'))

// fix offline on windows by specifying 127.0.0.1 instead of localhost (default)
var id = ssbConfig.keys.id
ssbConfig.remote = `net:127.0.0.1:${ssbConfig.port}~shs:${id.slice(1).replace('.ed25519', '')}`

module.exports = ssbConfig
