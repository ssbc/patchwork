var h = require('../lib/h')
var when = require('@mmckegg/mutant/when')
var plugs = require('patchbay/plugs')
var message_link = plugs.first(exports.message_link = [])

exports.message_content = exports.message_content_mini = function (msg, sbot) {
  if (msg.value.content.type === 'git-update') {
    var commits = msg.value.content.commits || []
    return [
      h('a', {href: `#${msg.key}`}, [
        'pushed',
        when(commits, [' ', pluralizeCommits(commits)])
      ]),
      ' to ',
      message_link(msg.value.content.repo)
    ]
  }
}

function pluralizeCommits (commits) {
  return when(commits.length === 1, '1 commit', `${commits.length} commits`)
}
