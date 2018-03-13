const { Value, computed, map, when, h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'about.obs.valueFrom': 'first',
  'keys.sync.id': 'first',
  'message.html.render': 'first',
  'message.obs.get': 'first',
  'tag.html.tag': 'first',
  'tag.obs.allTagsFrom': 'first',
  'tag.obs.taggedMessages': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (!path.startsWith('/tags')) return

    const myId = api.keys.sync.id()
    const tags = map(
      api.tag.obs.allTagsFrom(myId),
      tagId => {
        return { tagId, tagName: api.about.obs.valueFrom(tagId, 'name', myId) }
      }
    )
    const selectedTagId = Value(path.split('/')[2])
    const name = computed(
      selectedTagId,
      tagId => tagId
        ? api.about.obs.valueFrom(tagId, 'name', myId)
        : Value('Select A Tag')
    )
    const tagMessages = computed(
      selectedTagId,
      tagId => tagId
        ? map(
            api.tag.obs.taggedMessages(myId, tagId),
            msgId => api.message.obs.get(msgId)
          )
        : []
    )

    var prepend = [
      h('PageHeading', [
        h('h1', [ h('strong', 'Tags'), ' from you' ]),
      ])
    ]

    return h('div.SplitView', [
      h('div.side', map(
        tags,
        tag => computed(
          tag,
          ({ tagId, tagName }) =>
            h('a', {
              'ev-click': () => selectedTagId.set(tagId)
            }, api.tag.html.tag({ tagName, tagId }, null))
        )
      )),
      h('div.main', [
        h('Scroller',[
          h('h2', name),
          h('section.messages', [
            map(
              tagMessages,
              msg => computed(msg, msg => {
                if (msg && !msg.value.missing) {
                  return h('div.messagewrapper', api.message.html.render(msg))
                }
              })
            )
          ])
        ])
      ])
    ])
  })
}
