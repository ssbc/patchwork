var nest = require('depnest')
const TagHelper = require('scuttle-tag')

exports.needs = nest({
  'about.obs.name': 'first',
  'intl.sync.startsWith': 'first',
  'keys.sync.id': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('tag.async.suggest')

exports.create = function (api) {
  return nest('tag.async.suggest', function (staged) {
    const ScuttleTag = TagHelper(api.sbot.obs.connection)
    return (word, cb) => ScuttleTag.async.getSuggestions({
      word,
      myId: api.keys.sync.id(),
      stagedTagIds: staged(),
      matchFn: api.intl.sync.startsWith,
      nameFn: (id) => api.about.obs.name(id)()
    }, cb)
  })
}
