const h = require('mutant/h')
const nest = require('depnest')
const addSuggest = require('suggest-box')
const ssbUri = require('ssb-uri')
const electron = require('electron')

exports.needs = nest({
  'profile.async.suggest': 'first',
  'channel.async.suggest': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('app.html.search')

const pages = ['/public', '/private', '/mentions', '/all', '/gatherings', '/participating', '/attending-gatherings']

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('app.html.search', function (setView) {
    const getProfileSuggestions = api.profile.async.suggest()
    const getChannelSuggestions = api.channel.async.suggest()
    const searchBox = h('input.search', {
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
    electron.ipcRenderer.on('activateSearch', () => {
      searchBox.focus()
      searchBox.select() // should handle selecting everything in the box
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
      const value = searchBox.value.trim()

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
