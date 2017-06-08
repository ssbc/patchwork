var nest = require('depnest')
var { h, map, computed } = require('mutant')

exports.needs = nest({
  'message.obs': {
    backlinks: 'first',
    forks: 'first',
    name: 'first',
    author: 'first'
  },
  'profile.html.person': 'first'
})

exports.gives = nest('message.html.backlinks')

exports.create = function (api) {
  return nest('message.html.backlinks', function (msg, {includeReferences = true, includeForks = true} = {}) {
    var references = includeReferences ? api.message.obs.backlinks(msg.key) : []
    var forks = (includeForks && msg.value.content.root) ? api.message.obs.forks(msg.key) : []
    return [
      map(forks, msgId => {
        return h('a.backlink', {
          href: msgId,
          title: msgId
        }, [
          h('strong', [
            authorLink(msgId), ' forked this discussion:'
          ]), ' ',
          api.message.obs.name(msgId)
        ])
      }),
      map(references, msgId => {
        return h('a.backlink', {
          href: msgId,
          title: msgId
        }, [
          h('strong', [
            authorLink(msgId), ' referenced this message:'
          ]), ' ',
          api.message.obs.name(msgId)
        ])
      })
    ]
  })

  function authorLink (msgId) {
    var author = api.message.obs.author(msgId)
    return computed(author, author => {
      if (author) {
        return api.profile.html.person(author)
      } else {
        return 'Someone'
      }
    })
  }
}
