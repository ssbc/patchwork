var http = require('http')
var https = require('https')
var ws = require('pull-ws-server')
var path = require('path')
var api = require('./api')

exports.name        = 'patchwork'
exports.version     = '1.0.0'
exports.manifest    = require('./api/manifest')
exports.permissions = require('./api/permissions')

exports.init = function (sbot, config) {

  // validate the config
  var configOracle = require('./config')(config)
  if (configOracle.hasError()) {
    if (configOracle.allowUnsafe())
      console.log('\nIgnoring unsafe configuration due to --unsafe flag.')
    else {
      console.log('\nAborted due to unsafe config. Run again with --unsafe to override.')
      process.exit(1)
    }
  }

  // setup server
  var httpStack = require('./http-server')
  var httpServerFn = httpStack.AppStack(sbot, { uiPath: path.join(__dirname, 'ui') }, configOracle)
  var wsServerFn = require('./ws-server')(sbot)

  var serverOpts = configOracle.useTLS() ? configOracle.getTLS() : {}
  serverOpts.verifyClient = require('./ws-server').verifyClient(configOracle)
  var server = ws.createServer(serverOpts)
  server.on('connection', wsServerFn)
  server.on('request', httpServerFn)
  server.listen(configOracle.getPort())
  console.log('Serving at', configOracle.getLocalUrl())

  // run electron-specific code, if appropriate
  // if (process.versions['electron']) {
  //   require('./electron')(configOracle)
  // }

  return api(sbot, config)
}