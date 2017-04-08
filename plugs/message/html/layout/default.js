const { when, h, map, computed } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'profile.html.person': 'first',
  'message.obs.backlinks': 'first',
  'message.obs.name': 'first',
  'message.html': {
    link: 'first',
    meta: 'map',
    action: 'map',
    timestamp: 'first'
  },
  'about.html.image': 'first'
})

exports.gives = nest('message.html.layout')

exports.create = function (api) {
  return nest('message.html.layout', layout)

  function layout (msg, opts) {
    if (!(opts.layout === undefined || opts.layout === 'default')) return

    var backlinks = opts.backlinks ? api.message.obs.backlinks(msg.key) : []
    var classList = ['Message']
    var replyInfo = null

    if (msg.value.content.root) {
      classList.push('-reply')
      var branch = msg.value.content.branch
      if (branch) {
        if (!opts.previousId || (opts.previousId && last(branch) && opts.previousId !== last(branch))) {
          replyInfo = h('span', ['in reply to ', api.message.html.link(last(branch))])
        }
      }
    } else if (msg.value.content.project) {
      replyInfo = h('span', ['on ', api.message.html.link(msg.value.content.project)])
    }

    if (opts.priority === 2) {
      classList.push('-new')
    }

    return h('div', {
      classList
    }, [
      messageHeader(msg, replyInfo, opts.priority),
      h('section', [opts.content]),
      computed(msg.key, (key) => {
        if (ref.isMsg(key)) {
          return h('footer', [
            h('div.actions', [
              api.message.html.action(msg)
            ])
          ])
        }
      }),
      map(backlinks, backlink => {
        return h('a.backlink', {
          href: backlink,
          title: backlink
        }, [
          h('strong', 'Referenced from'), ' ', api.message.obs.name(backlink)
        ])
      })
    ])

    // scoped

    function messageHeader (msg, replyInfo, priority) {
      var additionalMeta = []
      if (opts.priority >= 2) {
        additionalMeta.push(h('span.flag -new', {title: 'New Message'}))
      }
      return h('header', [
        h('div.main', [
          h('a.avatar', {href: `${msg.value.author}`}, [
            api.about.html.image(msg.value.author)
          ]),
          h('div.main', [
            h('div.name', [
              api.profile.html.person(msg.value.author)
            ]),
            h('div.meta', [
              api.message.html.timestamp(msg), ' ', replyInfo
            ])
          ])
        ]),
        h('div.meta', [
          api.message.html.meta(msg),
          additionalMeta
        ])
      ])
    }
  }
}

function last (array) {
  if (Array.isArray(array)) {
    return array[array.length - 1]
  } else {
    return array
  }
}
