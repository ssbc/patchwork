const { shell } = require('electron')
const net = require('net')

const externalViewer = 'https://git.scuttlebot.io'
const localViewer = 'http://localhost:7718'

const gitMessageTypes = [
  'git-repo',
  'git-update',
  'issue',
  'issue-edit',
  'pull-request'
]

module.exports = function (msg) {
  if (!gitMessageTypes.includes(msg.value.content.type)) return
  return function gitHandler (id) {
    portInUse(7718, (useLocal) => {
      shell.openExternal(`${useLocal ? localViewer : externalViewer}/${encodeURIComponent(id)}`)
    })
  }
}

function portInUse (port, cb) {
  // super hacky check!
  const server = net.createServer(function () {})
  server.listen(port, '127.0.0.1')
  server.on('error', function () {
    cb(true) // eslint-disable-line node/no-callback-literal
  })
  server.on('listening', function () {
    server.close()
    cb(false) // eslint-disable-line node/no-callback-literal
  })
}
