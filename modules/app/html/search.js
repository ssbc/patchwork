var h = require('mutant/h')
var nest = require('depnest')
var addSuggest = require('suggest-box')
var ssbUri = require('ssb-uri')

exports.needs = nest({
  'profile.async.suggest': 'first',
  'channel.async.suggest': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('app.html.search')

var pages = ['/public', '/private', '/mentions', '/all', '/gatherings']

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('app.html.search', function (setView) {
    var getProfileSuggestions = api.profile.async.suggest()
    var getChannelSuggestions = api.channel.async.suggest()
    var searchBox = h('input.search', {
      type: 'search',
      title: i18n('Search for word, @feedId, #channel or %msgId\nYou can also add author:@id or is:private for more filtering'),
      placeholder: i18n('word, @key, #channel'),
      'ev-suggestselect': (ev) => {
        setView(ev.detail.id)
        searchBox.value = ev.detail.id
      },
      'ev-keydown': (ev) => {
        if (ev.key === 'Enter') {
          doSearch()
          ev.preventDefault()
        }
      }
    })

    setImmediate(() => {
      addSuggest(searchBox, (inputText, cb) => {
        if (inputText[0] === '@') {
          getProfileSuggestions(inputText.slice(1), cb)
        } else if (inputText[0] === '#') {
          getChannelSuggestions(inputText.slice(1), cb)
        } else if (inputText[0] === '/') {
          cb(null, getPageSuggestions(inputText))
        }
      }, { cls: 'SuggestBox' })
    })

    return searchBox

    function doSearch () {
      const prefixes = ['/', '?', '@', '#', '%', 'ssb:']
      var value = searchBox.value.trim()

      if (prefixes.some(p => value.startsWith(p))) {
        if (value.startsWith('@') && value.length < 30) {
          // probably not a key
        } else if (value.startsWith('ssb:')) {
          try {
            setView(ssbUri.toSigilLink(value))
          } catch (e) {
            // not a URI
          }
        } else if (value.length > 2) {
          setView(value)
        }
      } else if (value.trim()) {
        if (value.length > 2) {
          setView(`?${value.trim()}`)
        }
      }
    }

    function getPageSuggestions (input) {
      return pages.sort().filter(p => p.startsWith(input.toLowerCase())).map(p => {
        return {
          id: p,
          value: p,
          title: p
        }
      })
    }
  })
}
