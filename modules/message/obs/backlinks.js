var nest = require('depnest')
var computed = require('mutant/computed')

exports.needs = nest({
  'backlinks.obs.for': 'first',
  'message.sync.root': 'first'
})

exports.gives = nest('message.obs.backlinks', true)

exports.create = function (api) {
  return nest({
    // DEPRECATED: should use backlinks.obs.for
    'message.obs.backlinks': (id) => backlinks(id)
  })

  function backlinks (id) {
    return computed([api.backlinks.obs.for(id)], (msgs) => {
      return msgs.map(map).filter((backlink) => {
        return backlink.type !== 'vote' && backlink.type !== 'about'
      })
    })
  }

  function map (msg) {
    return {
      dest: msg.dest,
      id: msg.key,
      timestamp: msg.timestamp,
      type: msg.value.content.type,
      root: api.message.sync.root(msg),
      branch: msg.value.content.branch,
      author: msg.value.author
    }
  }
}
