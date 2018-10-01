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
    return withDefault(MutantPullValue(() => {
      return api.sbot.pull.stream((sbot) => sbot.patchwork.about.socialValueStream({dest: id, key}))
    }), defaultValue)
  }

  function socialValues (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    return MutantPullDict(() => {
      return api.sbot.pull.stream((sbot) => sbot.patchwork.about.socialValuesStream({dest: id, key}))
    })
  }

  function groupedValues (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    return computed(socialValues(id, key), getGroupedValues)
  }
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
  if (item && item[0]) {
    if (typeof item[0] === 'string') {
      return item[0]
    } else if (item[0] && item[0].link && ref.isLink(item[0].link) && !item[0].remove) {
      return item[0].link
    }
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
