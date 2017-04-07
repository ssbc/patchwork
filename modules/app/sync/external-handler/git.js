const nest = require('depnest')
const {shell} = require('electron')

exports.gives = nest('app.sync.externalHandler')

var viewer = 'http://git.scuttlebot.io'
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
      shell.openExternal(`${viewer}/${encodeURIComponent(id)}`)
    }
  })
}
