var nest = require('depnest')
var {computed, watch} = require('mutant')

exports.needs = nest({
  'channel.obs.recent': 'first',
  'channel.obs.subscribed': 'first',
  'channel.obs.mostActive': 'first',
  'intl.sync.startsWith': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('channel.async.suggest')

exports.create = function (api) {
  var subscribed = null
  var matches = api.intl.sync.startsWith

  return nest('channel.async.suggest', function () {
    var id = api.keys.sync.id()
    var mostActive = api.channel.obs.mostActive()
    subscribed = subscribed || api.channel.obs.subscribed(id)

    var channels = computed([subscribed, mostActive], function (a, b) {
      var result = Array.from(a)
      b.forEach((item, i) => {
        if (!result.includes(item[0])) {
          result.push(item)
        }
      })
      return result
    })

    watch(channels)

    return function (word) {
      if (!word) {
        return channels().slice(0, 200).map(getSuggestion)
      } else {
        return channels().filter((item) => {
          return matches(getName(item), word)
        }).map(getSuggestion)
      }
    }
  })

  function getName (item) {
    if (Array.isArray(item)) {
      return item[0]
    } else {
      return item
    }
  }

  function getSuggestion (id) {
    if (Array.isArray(id)) {
      return {
        title: id[0],
        id: `#${id[0]}`,
        subtitle: subscribedCaption(id[0], subscribed(), `(${id[1]})`),
        value: `#${id[0]}`
      }
    } else {
      return {
        title: id,
        id: `#${id}`,
        subtitle: subscribedCaption(id, subscribed()),
        value: `#${id}`
      }
    }
  }
}

function subscribedCaption (id, subscribed, fallback) {
  if (subscribed.has(id)) {
    return 'subscribed'
  } else {
    return fallback || ''
  }
}
