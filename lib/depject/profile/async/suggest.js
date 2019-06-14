var nest = require('depnest')

var { onceTrue } = require('mutant')
var fallbackImageUrl = 'data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

exports.needs = nest({
  'profile.obs.recentlyUpdated': 'first',
  'profile.async.avatar': 'first',
  'contact.obs.following': 'first',
  'about.obs.name': 'first',
  'about.obs.imageUrl': 'first',
  'blob.sync.url': 'first',
  'intl.sync.startsWith': 'first',
  'keys.sync.id': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('profile.async.suggest')

exports.create = function (api) {
  return nest('profile.async.suggest', function () {
    return function (text, defaultIds, cb) {
      if (arguments.length === 2 && typeof defaultIds === 'function') {
        cb = defaultIds
        defaultIds = null
      }
      onceTrue(api.sbot.obs.connection, sbot => {
        sbot.patchwork.suggest.profile({ text, defaultIds, limit: 20 }, (err, items) => {
          if (err) return cb(err)
          cb(null, getSuggestions(items))
        })
      })
    }
  })

  function getSuggestions (items) {
    return items.map(item => {
      return {
        title: item.name,
        id: item.id,
        subtitle: item.id.substring(0, 10),
        value: `[@${item.name}](${item.id})`,
        cls: item.following ? 'following' : null,
        image: item.image ? api.blob.sync.url(item.image) : fallbackImageUrl,
        showBoth: true
      }
    })
  }
}
