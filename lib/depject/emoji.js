const emojis = require('emoji-named-characters')
const emojiNames = Object.keys(emojis)
const nest = require('depnest')
const path = require('path')

exports.needs = nest('blob.sync.url', 'first')
exports.gives = nest({
  'emoji.sync': [
    'names',
    'url'
  ]
})

exports.create = function (api) {
  return nest({
    'emoji.sync': {
      names,
      url
    }
  })

  function names () {
    return emojiNames
  }

  function url (emoji) {
    return emoji in emojis && path.join(__dirname, '..', '..', `node_modules/emoji-named-characters/pngs/${emoji}.png`)
  }
}
