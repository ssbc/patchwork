var {computed} = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')
var colorHash = new (require('color-hash'))()
var fallbackImageUrl = 'data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
var MutantPullValue = require('../../lib/mutant-pull-value')
var MutantPullDict = require('../../lib/mutant-pull-dict')

exports.needs = nest({
  'sbot.pull.stream': 'first',
  'blob.sync.url': 'first',
  'about.sync.shortFeedId': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest({
  'about.obs': [
    'name',
    'description',
    'image',
    'imageUrl',
    'names',
    'images',
    'color',
    'latestValue',
    'valueFrom',
    'socialValue',
    'groupedValues',
    'socialValues'
  ]
})

exports.create = function (api) {
  var socialValueCache = {}
  return nest({
    'about.obs': {
      // quick helpers, probably should deprecate!
      name: (id) => socialValue(id, 'name', api.about.sync.shortFeedId(id)),
      description: (id) => socialValue(id, 'description'),
      image: (id) => socialValue(id, 'image'),
      names: (id) => groupedValues(id, 'name'),
      images: (id) => groupedValues(id, 'image'),
      color: (id) => computed(id, (id) => colorHash.hex(id)),
      imageUrl: (id) => computed(socialValue(id, 'image'), (blobId) => {
        return blobId ? api.blob.sync.url(blobId) : fallbackImageUrl
      }),

      // custom abouts (the future!)
      valueFrom,
      latestValue,
      socialValue,
      socialValues,
      groupedValues
    }
  })

  function valueFrom (id, key, author) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    return MutantPullValue(() => {
      return api.sbot.pull.stream((sbot) => sbot.patchwork.about.valueFromStream({dest: id, key, id: author}))
    })
  }

  function latestValue (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    return MutantPullValue(() => {
      return api.sbot.pull.stream((sbot) => sbot.patchwork.about.latestValueStream({dest: id, key}))
    })
  }

  function socialValue (id, key, defaultValue) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    if (!socialValueCache[id + '/' + key]) {
      var obs = socialValueCache[id + '/' + key] = MutantPullValue(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.about.socialValueStream({dest: id, key}))
      }, {
        onListen: () => { socialValueCache[id + '/' + key] = obs },
        onUnlisten: () => delete socialValueCache[id + '/' + key]
      })
    }
    return withDefault(socialValueCache[id + '/' + key], defaultValue)
  }

  function socialValues (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    return MutantPullDict(() => {
      return api.sbot.pull.stream((sbot) => sbot.patchwork.about.socialValuesStream({dest: id, key}))
    }, {checkDelete})
  }

  function groupedValues (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    return computed(socialValues(id, key), getGroupedValues)
  }
}

function checkDelete (msg) {
  if (msg && msg.remove) return true
}

function getGroupedValues (lookup) {
  var values = {}
  for (var author in lookup) {
    var value = getValue(lookup[author])
    if (value != null) {
      values[value] = values[value] || []
      values[value].push(author)
    }
  }
  return values
}

function getValue (item) {
  if (typeof item === 'string') {
    return item
  } else if (item && item.link && ref.isLink(item.link) && !item.remove) {
    return item.link
  }
}

function withDefault (value, defaultValue) {
  if (typeof defaultValue === 'undefined') {
    return value
  } else {
    return computed([value, defaultValue], fallback)
  }
}

function fallback (value, defaultValue) {
  if (value == null) {
    return defaultValue
  } else {
    return value
  }
}
