var {h, when} = require('mutant')
var nest = require('depnest')
var extend = require('xtend')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first',
    link: 'first',
    markdown: 'first'
  }
})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  return nest('message.html.render', function renderMessage (msg, opts) {
    if (msg.value.content.type !== 'git-update') return
    var element = api.message.html.layout(msg, extend({
      content: messageContent(msg),
      layout: 'mini'
    }, opts))

    return api.message.html.decorate(element, { msg })
  })

  function messageContent (msg) {
    var commits = msg.value.content.commits || []
    return [
      h('a', {href: msg.key, title: commitSummary(commits)}, [
        'pushed',
        when(commits, [' ', pluralizeCommits(commits)])
      ]),
      ' to ',
      api.message.html.link(msg.value.content.repo)
    ]
  }
}

function pluralizeCommits (commits) {
  return when(commits.length === 1, '1 commit', `${commits.length} commits`)
}

function commitSummary (commits) {
  return commits.map(commit => `- ${commit.title}`).join('\n')
}
