const nest = require('depnest')
var emoji = require('emojilib')
var addSuggest = require('suggest-box')
var resolve = require('mutant/resolve')
var onceTrue = require('mutant/once-true')

exports.needs = nest({
  'profile.async.suggest': 'first',
  'channel.async.suggest': 'first',
  'emoji.sync.names': 'first',
  'emoji.sync.url': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('suggest.hook')

exports.create = function (api) {
  return nest('suggest.hook', function SuggestHook ({ participants } = {}) {
    var getProfileSuggestions = api.profile.async.suggest()
    var getChannelSuggestions = api.channel.async.suggest()

    return function (textArea) {
      addSuggest(textArea, (inputText, cb) => {
        if (inputText[0] === '@') {
          getProfileSuggestions(inputText.slice(1), resolve(participants), cb)
        } else if (inputText[0] === '#') {
          getChannelSuggestions(inputText.slice(1), cb)
        } else if (inputText[0] === ':') {
          // suggest emojis
          var word = inputText.slice(1)
          if (word[word.length - 1] === ':') {
            word = word.slice(0, -1)
          }
          cb(null, suggestEmoji(word).slice(0, 100).map(function (emoji) {
            return {
              image: api.emoji.sync.url(emoji),
              title: emoji,
              subtitle: emoji,
              value: ':' + emoji + ':'
            }
          }))
        } else if (inputText[0] === '&') {
          onceTrue(api.sbot.obs.connection, sbot => {
            sbot.meme.search(inputText.slice(1), (err, memes) => {
              console.log('the dankest memes:', memes)
              cb(null, [{title: 'hello'}])
            })
          })
        }
      }, { cls: 'SuggestBox' })
    }
  })

  function suggestEmoji (prefix) {
    var availableEmoji = api.emoji.sync.names()
    return emoji.ordered.filter(key => {
      if (!availableEmoji.includes(key)) return false
      return key.startsWith(prefix) || key.includes('_' + prefix) || emoji.lib[key].keywords.some(word => word.startsWith(prefix) || word.startsWith(':' + prefix))
    })
  }
}
