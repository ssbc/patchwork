const nest = require('depnest')
const { isFeedId } = require('ssb-ref')
const { h, resolve, Struct, Array: MutantArray } = require('mutant')
const addSuggest = require('suggest-box')

exports.gives = nest('secrets.html.suggestCustodians')

exports.needs = nest({
  'profile.async.suggest': 'first'
})

exports.create = (api) => {
  const getProfileSuggestions = api.profile.async.suggest()

  return nest('secrets.html.suggestCustodians', function (props, cb) {
    const {
      recps = MutantArray([])
    } = props

    const state = Struct({
      isEmpty: true,
      wasEmpty: null
    })

    const suggestBox = h('input', {
      type: 'search',
      'ev-suggestselect': (ev) => {
        const { id: link, title: name } = ev.detail
        const isPresent = resolve(recps).find(recp => recp === link || recp.link === link)

        if (!isPresent) {
          if (recps.getLength() >= 7) return // max recps hard coded at 7

          recps.push({ link, name })
        }

        ev.target.value = ''
        ev.target.placeholder = ''
      },
      'ev-keydown': (ev) => {
        if (recps.getLength() >= 7 && !isBackspace(ev)) {
          ev.preventDefault()
          return false
        }
      },
      'ev-keyup': (ev) => {
        state.isEmpty.set(resolve(state.wasEmpty) && ev.target.value.length === 0)
        if (isBackspace(ev) && resolve(state.isEmpty) && recps.getLength() > 0) recps.pop()
        state.wasEmpty.set(ev.target.value.length === 0)
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
