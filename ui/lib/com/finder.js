'use strict'
var h = require('hyperscript')

module.exports = function () {
  var input = h('input', { onkeydown: onkeydown, placeholder: 'Search...' })
  var finder = h('#finder', input)

  function onkeydown (e) {
    if (e.keyCode == 13) // enter
      finder.find()
  }
  finder.find = find.bind(finder)
  window.addEventListener('keydown', onwinkeydown)

  function onwinkeydown (e) {
    if (e.keyCode == 27) { // esc
      window.removeEventListener('keydown', onwinkeydown)
      finder.removeEventListener('keydown', onkeydown)
      finder.parentNode.removeChild(finder)
    }
  }

  return finder
}

function find () {
  var el = this.querySelector('input')
  var v = el.value
  el.blur()
  document.body.querySelector('#page').focus()
  window.find(v,0,0,0,0,0,1)
}

