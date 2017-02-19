var h = require('mutant/h')
var nest = require('depnest')
var extend = require('xtend')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  }
})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  // no fallback
  return nest('message.html.render', () => null)
}
