var h = require('../lib/h')
var when = require('@mmckegg/mutant/when')

var plugs = require('patchbay/plugs')
var message_content = plugs.first(exports.message_content = [])
var message_content_mini = plugs.first(exports.message_content_mini = [])
var message_link = plugs.first(exports.message_link = [])
var avatar_image = plugs.first(exports.avatar_image = [])
var avatar_name = plugs.first(exports.avatar_name = [])
var avatar_link = plugs.first(exports.avatar_link = [])
var message_meta = plugs.map(exports.message_meta = [])
var message_main_meta = plugs.map(exports.message_main_meta = [])
var message_action = plugs.map(exports.message_action = [])
var contextMenu = require('../lib/context-menu')

exports.data_render = function (msg) {
  var div = h('Message -data', {
    'ev-contextmenu': contextMenu.bind(null, msg)
  }, [
    messageHeader(msg),
    h('section', [
      h('pre', [
        JSON.stringify(msg.value, null, 2)
      ])
    ])
  ])
  return div
}

exports.message_render = function (msg, opts) {
  var inContext = opts.inContext
  var previousId = opts.previousId
  var inSummary = opts.inSummary

  var elMini = message_content_mini(msg)
  var el = message_content(msg)

  if (elMini && (!el || inSummary)) {
    var div = h('Message', {
      'ev-contextmenu': contextMenu.bind(null, msg)
    }, [
      h('header', [
        h('div.mini', [
          avatar_link(msg.value.author, avatar_name(msg.value.author), ''),
          ' ', elMini
        ]),
        h('div.meta', [message_main_meta(msg)])
      ])
    ])
    div.setAttribute('tabindex', '0')
    return div
  }

  if (!el) return

  var classList = []
  var replyInfo = null

  if (msg.value.content.root) {
    classList.push('-reply')
    if (!inContext) {
      replyInfo = h('span', ['in reply to ', message_link(msg.value.content.root)])
    } else if (previousId && last(msg.value.content.branch) && previousId !== last(msg.value.content.branch)) {
      replyInfo = h('span', ['in reply to ', message_link(last(msg.value.content.branch))])
    }
  }

  var element = h('Message', {
    classList,
    'ev-contextmenu': contextMenu.bind(null, msg),
    'ev-keydown': function (ev) {
      // on enter, hit first meta.
      if (ev.keyCode === 13) {
        element.querySelector('.enter').click()
      }
    }
  }, [
    messageHeader(msg, replyInfo),
    h('section', [el]),
    when(msg.key, h('footer', [
      h('div.actions', [
        message_action(msg),
        h('a', {href: '#' + msg.key}, 'Reply')
      ])
    ]))
  ])

  // ); hyperscript does not seem to set attributes correctly.
  element.setAttribute('tabindex', '0')

  return element
}

function messageHeader (msg, replyInfo) {
  return h('header', [
    h('div.main', [
      h('a.avatar', {href: `#${msg.value.author}`}, avatar_image(msg.value.author)),
      h('div.main', [
        h('div.name', [
          h('a', {href: `#${msg.value.author}`}, avatar_name(msg.value.author))
        ]),
        h('div.meta', [
          message_main_meta(msg),
          ' ', replyInfo
        ])
      ])
    ]),
    h('div.meta', message_meta(msg))
  ])
}

function last (array) {
  if (Array.isArray(array)) {
    return array[array.length - 1]
  } else {
    return array
  }
}
