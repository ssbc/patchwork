const { computed, map, h } = require('mutant')
const nest = require('depnest')
const TagHelper = require('scuttle-tag')

exports.needs = nest({
  'about.obs.name': 'first',
  'keys.sync.id': 'first',
  'message.html.render': 'first',
  'message.obs.get': 'first',
  'sbot.obs.connection': 'first',
  'tag.html.tag': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (!path.startsWith('/tags')) return
    const urlId = path.substr(6)
    const currentTagId = urlId && decodeURIComponent(urlId)
    const myId = api.keys.sync.id()
    const ScuttleTag = TagHelper(api.sbot.obs.connection)

    const tags = map(ScuttleTag.obs.allTagsFrom(myId), tagId => ({
      tagId,
      tagName: api.about.obs.name(tagId)
    }))
    const name = currentTagId ? api.about.obs.name(currentTagId) : 'Select A Tag'
    const tagMessages =
      currentTagId ? map(ScuttleTag.obs.messagesTaggedByWith(myId, currentTagId), msgId =>
        api.message.obs.get(msgId)) : []

    return h('SplitView', [
      h('div.side', [
        h('h2', 'Your Tags'),
        map(tags, tag =>
          computed(tag, ({ tagId, tagName }) =>
            h('a.tag-link',
              { href: `/tags/${encodeURIComponent(tagId)}`, title: tagId },
              api.tag.html.tag({ tagName, tagId }, null))))
      ]),
      h('div.main', [
        h('Scroller', [
          h('h2', name),
          h('section.messages', [
            map(tagMessages, msg =>
              computed(msg, msg => {
                if (msg && !msg.value.missing) {
                  return h('div.messagewrapper', api.message.html.render(msg))
                }
              }))
          ])
        ])
      ])
    ])
  })
}
