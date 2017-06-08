var nest = require('depnest')
var ref = require('ssb-ref')
var { h, map, computed } = require('mutant')

exports.needs = nest({
  'message.obs': {
    backlinks: 'first',
    name: 'first',
    author: 'first'
  },
  'profile.html.person': 'first'
})

exports.gives = nest('message.html.backlinks')

exports.create = function (api) {
  return nest('message.html.backlinks', function (msg, {includeReferences = true, includeForks = true} = {}) {
    if (!ref.type(msg.key)) return []
    var backlinks = api.message.obs.backlinks(msg.key)
    var references = includeReferences ? computed([backlinks, msg], onlyReferences) : []
    var forks = (includeForks && msg.value.content.root) ? computed([backlinks, msg], onlyForks) : []
    return [
      map(forks, link => {
        return h('a.backlink', {
          href: link.id, title: link.id
        }, [
          h('strong', [
            api.profile.html.person(link.author), ' forked this discussion:'
          ]), ' ',
          api.message.obs.name(link.id)
        ])
      }),
      map(references, link => {
        return h('a.backlink', {
          href: link.id, title: link.id
        }, [
          h('strong', [
            api.profile.html.person(link.author), ' referenced this message:'
          ]), ' ',
          api.message.obs.name(link.id)
        ])
      })
    ]
  })
}

function onlyReferences (backlinks, msg) {
  return backlinks.filter(link => link.root !== msg.key && !includeOrEqual(link.branch, msg.key))
}

function onlyForks (backlinks, msg) {
  return backlinks.filter(link => link.root === msg.key && msg.value.content && msg.value.content.root)
}

function includeOrEqual (valueOrArray, item) {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.includes(item)
  } else {
    return valueOrArray === item
  }
}
