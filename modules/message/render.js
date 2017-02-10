var when = require('mutant/when')
var h = require('../../lib/h')
var contextMenu = require('../../lib/context-menu')

exports.needs = {
  message: {
    content: 'first',
    content_mini: 'first',
    link: 'first',
    meta: 'map',
    main_meta: 'map',
    action: 'map'
  },
  about: {
    image: 'first',
    name: 'first',
    link: 'first',
    name_link: 'first'
  }
}

exports.gives = {
  message: {
    data_render: true,
    render: true
  }
}

exports.create = function (api) {
  return {
    message: {
      data_render (msg) {
        var div = h('Message -data', {
          'ev-contextmenu': contextMenu.bind(null, msg)
        }, [
          messageHeader(msg),
          h('section', [
            h('pre', [
              JSON.stringify(msg, null, 2)
            ])
          ])
        ])
        return div
      },

      render (msg, opts) {
        opts = opts || {}
        var inContext = opts.inContext
        var previousId = opts.previousId
        var inSummary = opts.inSummary

        var elMini = api.message.content_mini(msg)
        var el = api.message.content(msg)

        if (elMini && (!el || inSummary)) {
          var div = h('Message', {
            'ev-contextmenu': contextMenu.bind(null, msg)
          }, [
            h('header', [
              h('div.mini', [
                api.about.link(msg.value.author, api.about.name(msg.value.author), ''),
                ' ', elMini
              ]),
              h('div.meta', [api.message.main_meta(msg)])
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
            replyInfo = h('span', ['in reply to ', api.message.link(msg.value.content.root)])
          } else if (previousId && last(msg.value.content.branch) && previousId !== last(msg.value.content.branch)) {
            replyInfo = h('span', ['in reply to ', api.message.link(last(msg.value.content.branch))])
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
              api.message.action(msg)
            ])
          ]))
        ])

        // ); hyperscript does not seem to set attributes correctly.
        element.setAttribute('tabindex', '0')

        return element
      }
    }
  }

  function messageHeader (msg, replyInfo) {
    return h('header', [
      h('div.main', [
        h('a.avatar', {href: `#${msg.value.author}`}, api.about.image(msg.value.author)),
        h('div.main', [
          h('div.name', [
            h('a', {href: `#${msg.value.author}`}, api.about.name(msg.value.author))
          ]),
          h('div.meta', [
            api.message.main_meta(msg),
            ' ', replyInfo
          ])
        ])
      ]),
      h('div.meta', api.message.meta(msg))
    ])
  }
}

function last (array) {
  if (Array.isArray(array)) {
    return array[array.length - 1]
  } else {
    return array
  }
}
