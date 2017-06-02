const { h, map, computed } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'profile.html.person': 'first',
  'message.obs.backlinks': 'first',
  'message.obs.name': 'first',
  'message.obs.forks': 'first',
  'message.obs.author': 'first',
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
    var forks = msg.value.content.root ? api.message.obs.forks(msg.key) : []

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
      messageHeader(msg, {
        replyInfo,
        priority: opts.priority
      }),
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
      map(forks, msgId => {
        return h('a.backlink', {
          href: msgId,
          title: msgId
        }, [
          h('strong', [
            authorLink(msgId), ' forked this discussion:'
          ]), ' ',
          api.message.obs.name(msgId)
        ])
      }),
      map(backlinks, msgId => {
        return h('a.backlink', {
          href: msgId,
          title: msgId
        }, [
          h('strong', [
            authorLink(msgId), ' referenced this message:'
          ]), ' ',
          api.message.obs.name(msgId)
        ])
      })
    ])

    // scoped

    function messageHeader (msg, {replyInfo, priority}) {
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
              api.message.html.timestamp(msg), ' ',
              replyInfo
            ])
          ])
        ]),
        h('div.meta', [
          api.message.html.meta(msg),
          additionalMeta
        ])
      ])
    }

    function authorLink (msgId) {
      var author = api.message.obs.author(msgId)
      return computed(author, author => {
        if (author) {
          return api.profile.html.person(author)
        } else {
          return 'Someone'
        }
      })
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
