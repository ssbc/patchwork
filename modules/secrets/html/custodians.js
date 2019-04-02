const nest = require('depnest')
const { isFeedId } = require('ssb-ref')
const { h, resolve, Struct, Array: MutantArray } = require('mutant')

exports.gives = nest('secrets.html.custodians')

exports.needs = nest({
  'secrets.async.suggest': 'first'
})

exports.create = (api) => {
  return nest('secrets.html.custodians', function (recps = MutantArray([]), cb = console.log) {
    const state = Struct({
      isEmpty: true,
      wasEmpty: null
    })

    const input = h('input', {
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
        if (isBackspace(ev) && resolve(state.isEmpty) && recps.getLength() > 0) {
          recps.pop()
          cb()
        }
        state.wasEmpty.set(ev.target.value.length === 0)
      }
    })

    api.secrets.async.suggest(input)

    return input
  })
}

function isBackspace (ev) {
  return ev.code === 'Backspace' ||
    ev.key === 'Backspace' ||
    ev.keyCode === 8
}
