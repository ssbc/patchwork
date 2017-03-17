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

    return h('div', {
      classList
    }, [
      messageHeader(msg, replyInfo),
      h('section', [opts.content]),
      map(backlinks, backlink => {
        return h('a.backlink', {
          href: backlink,
          title: backlink
        }, [
          h('strong', 'Referenced from'), ' ', api.message.obs.name(backlink)
        ])
      }),
      computed(msg.key, (key) => {
        if (ref.isMsg(key)) {
          return h('footer', [
            h('div.actions', [
              api.message.html.action(msg)
            ])
          ])
        }
      })
    ])

    // scoped

    function messageHeader (msg, replyInfo) {
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
        h('div.meta', api.message.html.meta(msg))
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
