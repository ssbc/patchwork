var nest = require('depnest')
var {Struct, map, computed, watch} = require('mutant')

exports.needs = nest({
  'profile.obs.recentlyUpdated': 'first',
  'contact.obs.following': 'first',
  'about.obs.name': 'first',
  'about.obs.imageUrl': 'first',
  'intl.sync.startsWith': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('profile.async.suggest')

exports.create = function (api) {
  var suggestions = null
  var recentSuggestions = null
  var following = null
  var matches = api.intl.sync.startsWith

  return nest('profile.async.suggest', function () {
    loadSuggestions()
    return function (word, defaultItems) {
      var defaultSuggestions = Array.isArray(defaultItems) && defaultItems.length ? suggestions().filter((item) => {
        return matches(item.title, word) && defaultItems.includes(item.id)
      }) : null

      if (!word) {
        return defaultSuggestions || recentSuggestions()
      } else {
        var result = defaultSuggestions || []

        // prioritize people you follow
        suggestions().forEach((item) => {
          if (following().includes(item.id) && matches(item.title, word) && !result.some(v => v.id === item.id)) {
            result.push(item)
          }
        })

        // next most recently active profiles
        recentSuggestions().forEach((item) => {
          if (matches(item.title, word) && !result.some(v => v.id === item.id)) {
            result.push(item)
          }
        })

        // fallback to everyone
        suggestions().forEach((item) => {
          if (matches(item.title, word) && !result.some(v => v.id === item.id)) {
            result.push(item)
          }
        })
        return result
      }
    }
  })

  function loadSuggestions () {
    if (!suggestions) {
      var id = api.keys.sync.id()
      following = api.contact.obs.following(id)
      var recentlyUpdated = api.profile.obs.recentlyUpdated()
      var contacts = computed([following, recentlyUpdated], function (a, b) {
        var result = Array.from(a)
        b.forEach((item, i) => {
          if (!result.includes(item)) {
            result.push(item)
          }
        })
        return result
      })

      recentSuggestions = map(computed(recentlyUpdated, (items) => Array.from(items).slice(0, 40)), suggestion, {idle: true})
      suggestions = map(contacts, suggestion, {idle: true})
      watch(recentSuggestions)
      watch(suggestions)
    }
  }

  function suggestion (id) {
    var name = api.about.obs.name(id)
    return Struct({
      title: name,
      id,
      subtitle: id.substring(0, 10),
      value: computed([name, id], mention, {idle: true}),
      cls: computed([id, following], followingClass, {idle: true}),
      image: api.about.obs.imageUrl(id),
      showBoth: true
    })
  }
}

function mention (name, id) {
  return `[@${name}](${id})`
}

function followingClass (id, following) {
  if (following.includes(id)) {
    return 'following'
  }
}
