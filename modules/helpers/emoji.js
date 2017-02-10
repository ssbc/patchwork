var emojis = require('emoji-named-characters')
var emojiNames = Object.keys(emojis)

exports.needs = {
  helpers: { blob_url: 'first' }
}

exports.gives = {
  helpers: {
    emoji_names: true,
    emoji_url: true
  }
}

exports.create = function (api) {
  return {
    helpers: {
      emoji_names,
      emoji_url
    }
  }

  function emoji_names () {
    return emojiNames
  }

  function emoji_url (emoji) {
    return emoji in emojis && `img/emoji/${emoji}.png`
  }
}
