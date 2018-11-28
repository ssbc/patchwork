const { h, computed, Value, when } = require('mutant')
var nest = require('depnest')
var ref = require('ssb-ref')
var ExpanderHook = require('../../../../lib/expander-hook')

exports.needs = nest({
  'profile.html.person': 'first',
  'message.obs.name': 'first',
  'contact.obs.following': 'first',
  'keys.sync.id': 'first',
  'message.html': {
    link: 'first',
    metas: 'first',
    actions: 'first',
    timestamp: 'first',
    backlinks: 'first'
  },
  'about.html.image': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html.layout')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  var yourFollows = null

  // to get sync follows
  setImmediate(() => {
    var yourId = api.keys.sync.id()
    yourFollows = api.contact.obs.following(yourId)
  })

  return nest('message.html.layout', layout)

  function layout (msg, { layout, previousId, priority, miniContent, content, includeReferences, includeForks = true, actions = true }) {
    if (!(layout === 'mini')) return

    var classList = ['Message -mini']

    var needsExpand = Value(false)
    var expanded = Value(false)

    // new message previews shouldn't contract
    if (!msg.key) expanded.set(true)

    if (yourFollows && yourFollows().includes(msg.value.author)) {
      classList.push('-following')
    }

    var replyInfo = null

    if (msg.value.content.root) {
      classList.push('-reply')
      var branch = msg.value.content.branch
      if (branch) {
        if (!previousId || (previousId && first(branch) && previousId !== first(branch))) {
          replyInfo = h('span', ['in reply to ', api.message.html.link(first(branch))])
        }
      }
    } else if (msg.value.content.project) {
      replyInfo = h('span', ['on ', api.message.html.link(msg.value.content.project)])
    }

    if (priority === 2) {
      classList.push('-new')
    }

    return h('div', {
      classList
    }, [
      messageHeader(msg, {
        replyInfo, priority, miniContent
      }),
      h('section', {
        classList: [ when(expanded, '-expanded') ],
        hooks: [ ExpanderHook(needsExpand) ]
      }, [content]),
      computed([msg.key, actions], (key, actions) => {
        if (ref.isMsg(key) && actions) {
          return h('footer', [
            when(needsExpand, h('div.expander', {
              classList: when(expanded, null, '-truncated')
            }, [
              h('a', {
                href: '#',
                'ev-click': toggleAndTrack(expanded)
              }, when(expanded, i18n('See less'), i18n('See more')))
            ])),
            h('div.actions', [
              api.message.html.actions(msg)
            ])
          ])
        }
      }),
      includeReferences ? api.message.html.backlinks(msg) : null
    ])

    // scoped

    function messageHeader (msg, { replyInfo, priority, miniContent }) {
      var yourId = api.keys.sync.id()
      var additionalMeta = []
      if (priority >= 2) {
        additionalMeta.push(h('span.flag -new', { title: 'New Message' }))
      }
      return h('header', [
        h('div.main', [
          h('a.avatar', { href: `${msg.value.author}` }, [
            api.about.html.image(msg.value.author)
          ]),
          h('div.main', [
            h('div.name', [
              api.profile.html.person(msg.value.author),
              msg.value.author === yourId ? [' ', h('span.you', {}, i18n('(you)'))] : null
            ]),
            h('div.meta', [
              miniContent, ' ',
              replyInfo
            ])
          ])
        ]),
        h('div.meta', [
          h('strong', api.message.html.timestamp(msg)),
          additionalMeta,
          api.message.html.metas(msg)
        ])
      ])
    }
  }
}

function first (array) {
  if (Array.isArray(array)) {
    return array[0]
  } else {
    return array
  }
}

function toggleAndTrack (param) {
  return {
    handleEvent: handleToggle,
    param
  }
}

function handleToggle (ev) {
  this.param.set(!this.param())
  if (!this.param()) {
    ev.target.scrollIntoViewIfNeeded()

    // HACK: due to a browser bug, sometimes the body gets affected!?
    // Why not just hack it!!!
    if (document.body.scrollTop > 0) {
      document.body.scrollTop = 0
    }
  }
}
