var nest = require('depnest')
var computed = require('mutant/computed')
var MutantProxy = require('mutant/proxy')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'keys.sync.id': 'first',
  'feed.pull.mentions': 'first',
  'contact.obs.sameAs': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function mentions (path) {
    if (path !== '/mentions') return
    var id = api.keys.sync.id()
    var sameAs = api.contact.obs.sameAs(id)
    var pendingUpdates = MutantProxy(0)

    // reload view if sameAs changes
    var result = computed(sameAs, ids => {
      var rollup = api.feed.html.rollup(api.feed.pull.mentions(ids), {
        compactFilter: (msg) => !mentionFilter(msg), // compact context messages
        bumpFilter: mentionFilter,
        displayFilter: mentionFilter
      })
      pendingUpdates.set(rollup.pendingUpdates)
      return rollup
    })

    result.pendingUpdates = pendingUpdates
    result.reload = () => result() && result().reload && result().reload()
    return result

    // scoped
    function mentionFilter (msg) {
      if (sameAs().includes(msg.value.author)) return false
      if (Array.isArray(msg.value.content.mentions) && msg.value.content.mentions.some(mention => {
        return mention && sameAs().includes(mention.link)
      })) {
        return 'mention'
      } else if (msg.value.content.type === 'contact') {
        return true
      } else if (msg.value.content.type === 'about') {
        return true
      }
    }
  })
}
