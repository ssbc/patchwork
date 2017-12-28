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

// exports.needs = nest({
//   'app.views': 'first'
// })

exports.create = function (api) {
  return nest('app.html.findInPage', function (views) {
    const shown = Value(false)
    const searchString = Value('')
    const resultCount = Value(null)

    window.searchString = searchString

    ipcRenderer.on('showSearch', () => shown.set(true))
    views.currentView(() => shown.set(false))

    ipcRenderer.on('found-in-page', (event, result) => {
      resultCount.set(result.matches - 1)
      console.log('found-in-page',{ event, result })
    })

    searchString(search => {
      if (search.length > 0) {
        console.log('sending', search)
        ipcRenderer.send('findInPage', search)
      } else {
        resultCount.set(null)
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
          console.log('focusing')
          input.focus()
          input.select()
        }, 5)
      }
    })
    return h('div', when(shown,
      h('div.search', [
        input,
        h('span.count', resultCount)
      ])
    ))
})
}
