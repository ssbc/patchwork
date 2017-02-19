var emojis = require('emoji-named-characters')
var nest = require('depnest')

exports.gives = nest('emoji.sync.url')

exports.create = function (api) {
  return nest('emoji.sync.url', (emoji) => {
    return emoji in emojis && `img/emoji/${emoji}.png`
  })
}
