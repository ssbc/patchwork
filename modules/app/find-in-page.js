var {remote, shell, clipboard, ipcRenderer } = require('electron')
var nest = require('depnest')
var { h, Value, computed, Struct, when } = require('mutant')

var {MenuItem, Menu} = remote

const ValueHook = (obs) => function (element) {
  element.value = obs()
  element.oninput = () => {
    obs.set(element.value.trim())
  }
}

const EscapeHook = (obs, value) => element => {
  element.onkeydown = event => {
    event.key === 'Escape' && obs.set(value)
  }
}

exports.gives = nest('app.html.findInPage')

exports.create = function (api) {
  return nest('app.html.findInPage', function (views) {
    const shown = Value(false)
    const searchString = Value('')
    const resultCount = Value(0)
    const currentMatchNum = Value(0)

    ipcRenderer.on('showSearch', () => shown.set(true))
    views.currentView(() => shown.set(false))

    // views.html.addEventListener('found-in-page', ({ result }) => {
    //   const {activeMatchOrdinal, finalUpdate, matches} = result
    //   currentMatchNum.set(activeMatchOrdinal)
    //   resultCount.set(matches)
    //   console.log('found-in-page', { activeMatchOrdinal, finalUpdate, matches })
    // })

    searchString(search => {
      if (search.length > 0) {
        // console.log('sending', search)
        window.find(search, false, false, true, false, true, true)
      } else {
        resultCount.set(0)
        currentMatchNum.set(0)
      }
    })

    const input = h('input', {
      type: 'search',
      value: searchString,
      hooks: [ValueHook(searchString), EscapeHook(shown, false)],
    })

    shown(val => {
      if (val) {
        setTimeout(() => {
          input.focus()
          input.select()
        }, 5)
      }
    })
    return h('div', when(shown,
      h('div.search', [
        input,
        when(searchString, h('span.count', [currentMatchNum, '/' , resultCount]))
      ])
    ))
})
}
