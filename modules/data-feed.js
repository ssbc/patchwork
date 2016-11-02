var h = require('hyperscript')
var u = require('patchbay/util')
var pull = require('pull-stream')
var Scroller = require('pull-scroll')

var plugs = require('patchbay/plugs')
var sbot_log = plugs.first(exports.sbot_log = [])
var data_render = plugs.first(exports.data_render = [])

exports.screen_view = function (path, sbot) {
  if(path === '/data-feed') {
    var content = h('div.column.scroller__content')
    var div = h('div.column.scroller',
      {style: {'overflow':'auto'}},
      h('div.scroller__wrapper',
        content
      )
    )

    pull(
      u.next(sbot_log, {old: false, limit: 100}),
      Scroller(div, content, data_render, true, false)
    )

    pull(
      u.next(sbot_log, {reverse: true, limit: 100, live: false}),
      Scroller(div, content, data_render, false, false)
    )

    return div
  }
}
