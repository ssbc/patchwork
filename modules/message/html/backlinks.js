var nest = require('depnest')
var ref = require('ssb-ref')
var { h, map, computed } = require('mutant')

exports.needs = nest({
  'message.sync.root': 'first',
  'message.obs': {
    backlinks: 'first',
    name: 'first',
    author: 'first'
  },
  'profile.html.person': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html.backlinks')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html.backlinks', function (msg, {includeReferences = true, includeForks = true} = {}) {
    if (!ref.type(msg.key)) return []

    var rootId = api.message.sync.root(msg)
    var backlinks = api.message.obs.backlinks(msg.key)
    var references = includeReferences ? computed([backlinks, msg], onlyReferences) : []
    var forks = (includeForks && rootId) ? computed([backlinks, msg], onlyForks) : []

    return [
      map(forks, link => {
        return h('a.backlink', {
          href: msg.key, anchor: link.id
        }, [
          h('strong', [
            api.profile.html.person(link.author), i18n(' forked this discussion:')
          ]), ' ',
          api.message.obs.name(link.id)
        ])
      }),
      map(references, link => {
        return h('a.backlink', {
          href: link.id, title: link.id
        }, [
          h('strong', [
            api.profile.html.person(link.author), i18n(' referenced this message:')
          ]), ' ',
          api.message.obs.name(link.id)
        ])
      })
    ]
  })

  function onlyReferences (backlinks, msg) {
    return backlinks.filter(link => link.root !== msg.key && !includeOrEqual(link.branch, msg.key) && link.type !== 'tag')
  }

  function onlyForks (backlinks, msg) {
    return backlinks.filter(link => link.root === msg.key && includeOrEqual(link.branch, msg.key) && api.message.sync.root(msg) && link.type !== 'tag')
  }
}

function includeOrEqual (valueOrArray, item) {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.includes(item)
  } else {
    return valueOrArray === item
  }
}
