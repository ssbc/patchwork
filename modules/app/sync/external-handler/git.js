const nest = require('depnest')
const {shell} = require('electron')
const net = require('net')

exports.gives = nest('app.sync.externalHandler')

var externalViewer = 'http://git.scuttlebot.io'
var localViewer = 'http://localhost:7718'

var gitMessageTypes = [
  'git-repo',
  'git-update',
  'issue',
  'issue-edit',
  'pull-request'
]

exports.create = (api) => {
  return nest('app.sync.externalHandler', function (msg) {
    if (!gitMessageTypes.includes(msg.value.content.type)) return
    return function gitHandler (id) {
      portInUse(7718, (useLocal) => {
        shell.openExternal(`${useLocal ? localViewer : externalViewer}/${encodeURIComponent(id)}`)
      })
    }
  })
}

function portInUse (port, callback) {
  // super hacky check!
  var server = net.createServer(function (socket) {})
  server.listen(port, '127.0.0.1')
  server.on('error', function (e) {
    callback(true)
  })
  server.on('listening', function (e) {
    server.close()
    callback(false)
  })
}
