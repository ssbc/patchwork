var { computed } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')
var colorHash = new (require('color-hash'))()
var fallbackImageUrl = 'data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
var MutantAsyncDict = require('../../lib/mutant-async-dict')
var MutantAsyncComputed = require('../../lib/mutant-async-computed')

exports.needs = nest({
  'blob.sync.url': 'first',
  'about.sync.shortFeedId': 'first',
  'keys.sync.id': 'first',
  'sqldb.obs.since': 'first',
  'about.async.socialValues': 'first',
  'about.async.socialValue': 'first',
  'about.async.latestValues': 'first',
  'about.async.latestValue': 'first'
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

  function valueFrom (id, key, authorId) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')
    function getNewItems (since, cb) {
      api.about.async.latestValue({ dest: id, key, author: authorId }, function (err, results) {
        if (err) return
        cb(results)
      })
    }

    return MutantAsyncComputed(api.sqldb.obs.since(), getNewItems)
  }

  function latestValue (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')

    function getNewItems (since, cb) {
      api.about.async.latestValue({ dest: id, key }, function (err, results) {
        if (err) return
        cb(results)
      })
    }

    return MutantAsyncComputed(api.sqldb.obs.since(), getNewItems)
  }

  function socialValue (id, key, defaultValue) {
    // TODO: Piet got rid of the cache here. I wonder if it's actually needed.
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')

    function getNewItems (since, cb) {
      api.about.async.socialValue({ dest: id, key }, function (err, results) {
        if (err) return
        cb(results)
      })
    }
    return withDefault(MutantAsyncComputed(api.sqldb.obs.since(), getNewItems), defaultValue)
  }

  function socialValues (id, key) {
    if (!ref.isLink(id)) throw new Error('About requires an ssb ref!')

    function getNewItems (since, cb) {
      api.about.async.socialValues({ dest: id, key, since }, function (err, results) {
        if (err) return
        cb(results)
      })
    }

    return MutantAsyncDict(api.sqldb.obs.since(), getNewItems)
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
