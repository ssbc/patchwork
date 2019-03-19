const nest = require('depnest')
const { isFeedId } = require('ssb-ref')
const { h, resolve, Struct } = require('mutant')
const addSuggest = require('suggest-box')

exports.gives = nest('secrets.html.suggestCustodians')

exports.needs = nest({
  'profile.async.suggest': 'first'
})

exports.create = (api) => {
  const getProfileSuggestions = api.profile.async.suggest()

  return nest('secrets.html.suggestCustodians', function (props) {
    const state = Struct({
      isEmpty: true
    })

    let wasEmpty

    const suggestBox = h('input', {
      type: 'search',
      'ev-suggestselect': (ev) => {
        const { id: link, title: name } = ev.detail
        const isPresent = resolve(props.recps).find(recp => recp === link || recp.link === link)
        if (isPresent) return // can only add each recp once
        if (props.recps.getLength() >= 7) return // max recps hard coded at 7
        props.recps.push({ link, name })
        ev.target.value = ''
        ev.target.placeholder = ''
      },
      'ev-keydown': (ev) => {
        if (props.recps.getLength() >= 7 && !isBackspace(ev)) {
          ev.preventDefault()
          return false
        }
      },
      'ev-keyup': (ev) => {
        state.isEmpty = wasEmpty && ev.target.value.length === 0
        if (isBackspace(ev) && state.isEmpty && props.recps.getLength() > 2) props.recps.pop()
        wasEmpty = ev.target.value.length === 0
      }
    })

    setImmediate(() => {
      addSuggest(
        suggestBox,
        (inputText, cb) => getProfileSuggestions(inputText.slice(1), cb),
        { cls: 'SuggestBox' })
    })

    return suggestBox
  })
}

function isBackspace (ev) {
  return ev.code === 'Backspace' ||
    ev.key === 'Backspace' ||
    ev.keyCode === 8
}
