const nest = require('depnest')
const ref = require('ssb-ref')
const { titleFromMarkdown, truncate } = require('../../../markdownSummary')
const { resolve, onceTrue } = require('mutant')

exports.needs = nest({
  'sbot.async.get': 'first',
  'sbot.pull.links': 'first',
  'message.sync.unbox': 'first',
  'about.obs.socialValue': 'first',
  'keys.sync.id': 'first'
})
exports.gives = nest('message.async.name')

// needs an async version

exports.create = function (api) {
  return nest('message.async.name', function (id, cb) {
    if (!ref.isLink(id)) throw new Error('an id must be specified')
    const fallbackName = id.substring(0, 10) + '...'
    api.sbot.async.get(id, function (err, value) {
      if (value && typeof value.content === 'string') {
        value = api.message.sync.unbox(value)
      }

      if (err && err.name === 'NotFoundError') {
        return cb(null, fallbackName + '...(missing)')
      } else if (value && typeof value.content.title === 'string') {
        return cb(null, truncate(value.content.title, 40))
      } else if (value && value.content.type === 'post' && typeof value.content.text === 'string') {
        if (value.content.text.trim()) {
          return cb(null, titleFromMarkdown(value.content.text, 40, 3) || fallbackName)
        }
      } else if (value && typeof value.content.text === 'string') {
        return cb(null, value.content.type + ': ' + titleFromMarkdown(value.content.text, 30, 3))
      } else {
        return getAboutName(id, cb)
      }

      return cb(null, fallbackName)
    })
  })

  function getAboutName (id, cb) {
    const name = api.about.obs.socialValue(id, 'name')
    const title = api.about.obs.socialValue(id, 'title')

    onceTrue(name.sync, () => {
      cb(null, resolve(name) || resolve(title) || id.substring(0, 10) + '...')
    })
  }
}
