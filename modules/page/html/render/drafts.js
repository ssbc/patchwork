var { h, Value, when, computed, map } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'message.html.compose': 'first',
  'drafts.sync.all': 'first',
  'drafts.sync.get': 'first',
  'drafts.sync.set': 'first',
  'drafts.sync.remove': 'first',
  'keys.sync.id': 'first',
  'intl.sync.i18n': 'first',
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', page)

  function page (path) {
    if (!path.startsWith('/drafts')) return

    const id = api.keys.sync.id()
    const allDrafts = api.drafts.sync.all()
    const draftKeys = Object.keys(allDrafts)
    const drafts = map(
      draftKeys,
      key => {
        var meta = JSON.parse(key)
        return { meta, value: allDrafts[key] }
      }
    )

    console.log(drafts)

    const selectedDraft = Value()

    var main = [
      h('div.SplitView', [
        h('div.side', [
          h('h2', 'Personal Drafts'),
          h('div.ChannelList', [
            h('a', { classList: "channel", "ev-click": () => selectedDraft.set("public"), href: "/public" }, [ 'Public' ]),
            h('a', { classList: "channel", "ev-click": () => selectedDraft.set("private"), href: "/private" }, [ 'Private' ])
          ]),
          h('h2', 'Message Drafts'),
          h('div.ChannelList', [
            map(drafts,
              draft => computed(draft, ({ meta, value }) => {
                if (meta.path !== "/message") return
                return h('a', { classList: "channel", "ev-click": () => selectedDraft.set(draft), href: meta.id }, [
                  h('span.name', [ meta.id ])
                ])
              })
            )
          ]),
          h('h2', 'Channel Drafts'),
          h('div.ChannelList', [
            map(drafts,
              draft => computed(draft, ({ meta, value }) => {
                if (meta.path === "/public" || meta.path === "/private" || meta.path === "/message") return
                return h('a', { classList: "channel", "ev-click": () => selectedDraft.set(draft), href: meta.id }, [
                  h('span.name', [ meta.id ])
                ])
              })
            )
          ]),
        ]),
        h('div.main', [
          h('Scroller', [
          ])
        ])
      ])
    ]
    return main
  }
}
