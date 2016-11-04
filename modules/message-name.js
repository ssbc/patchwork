var plugs = require('patchbay/plugs')
var sbot_links = plugs.first(exports.sbot_links = [])
var get_id = plugs.first(exports.get_id = [])
var sbot_get = plugs.first(exports.sbot_get = [])
var getAvatar = require('ssb-avatar')

exports.message_name = function (id, cb) {
  sbot_get(id, function (err, value) {
    if (err && err.name === 'NotFoundError') {
      return cb(null, id.substring(0, 10) + '...(missing)')
    } else if (value.content.type === 'post' && typeof value.content.text === 'string') {
      if (value.content.text.trim()) {
        return cb(null, titleFromMarkdown(value.content.text, 40))
      }
    } else if (value.content.type === 'git-repo') {
      return getRepoName(id, cb)
    } else if (typeof value.content.text === 'string') {
      return cb(null, value.content.type + ': ' + titleFromMarkdown(value.content.text, 30))
    }

    return cb(null, id.substring(0, 10) + '...')
  })
}

function titleFromMarkdown (text, max) {
  text = text.trim().split('\n', 2).join('\n')
  text = text.replace(/_|`|\*|\#|\[.*?\]|\(\S*?\)/g, '').trim()
  text = text.replace(/\:$/, '')
  text = text.trim().split('\n', 1)[0].trim()
  if (text.length > max) {
    text = text.substring(0, max - 2) + '...'
  }
  return text
}

function getRepoName (id, cb) {
  getAvatar({
    links: sbot_links,
    get: sbot_get
  }, get_id(), id, function (err, avatar) {
    if (err) return cb(err)
    cb(null, avatar.name)
  })
}
