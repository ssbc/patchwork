var h = require('mutant/h')
var nest = require('depnest')
var addSuggest = require('suggest-box')

exports.needs = nest({
  'profile.async.suggest': 'first',
  'channel.async.suggest': 'first'
})

exports.gives = nest('app.html.search')

exports.create = function (api) {
  return nest('app.html.search', function (setView) {
    var getProfileSuggestions = api.profile.async.suggest()
    var getChannelSuggestions = api.channel.async.suggest()
    var searchTimer = null
    var searchBox = h('input.search', {
      type: 'search',
      placeholder: 'word, @key, #channel',
      'ev-suggestselect': (ev) => {
        setView(ev.detail.id)
        searchBox.value = ev.detail.id
      },
      'ev-input': (ev) => {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(doSearch, 500)
      },
      'ev-focus': (ev) => {
        if (searchBox.value) {
          doSearch()
        }
      }
    })

    setImmediate(() => {
      addSuggest(searchBox, (inputText, cb) => {
        if (inputText[0] === '@') {
          cb(null, getProfileSuggestions(inputText.slice(1)), {idOnly: true})
        } else if (inputText[0] === '#') {
          cb(null, getChannelSuggestions(inputText.slice(1)))
        }
      }, {cls: 'SuggestBox'})
    })

    return searchBox

    function doSearch () {
      var value = searchBox.value.trim()
      if (value.startsWith('/') || value.startsWith('?') || value.startsWith('@') || value.startsWith('#') || value.startsWith('%')) {
        if (value.startsWith('@') && value.length < 30) {
          return // probably not a key
        } else if (value.length > 2) {
          setView(value)
        }
      } else if (value.trim()) {
        if (value.length > 2) {
          setView(`?${value.trim()}`)
        }
      } else {
        setView('/public')
      }
    }
  })
}
