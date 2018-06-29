const { Value, Array: MutantArray, computed, map, when, h } = require('mutant')
const nest = require('depnest')
const pull = require('pull-stream')
const TagHelper = require('scuttle-tag')
const filter = require('lodash/filter')

exports.needs = nest({
  'about.obs.name': 'first',
  'app.navigate': 'first',
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'message.html.render': 'first',
  'message.obs.get': 'first',
  'sbot.obs.connection': 'first',
  'tag.html.tag': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    const parts = path.split('/')
    if (parts[1] !== 'tags' || !parts[2] || !parts[3]) return
    const tagId = parts[2] === 'all' ? parts[2] : decodeURIComponent(parts[2])
    const author = parts[3] === 'all' ? parts[3] : decodeURIComponent(parts[3])
    const myId = api.keys.sync.id()
    const ScuttleTag = TagHelper(api.sbot.obs.connection)
    const Tag = tagId => ScuttleTag.obs.Tag(tagId, api.about.obs.name)
    const HtmlTag = (t) => api.tag.html.tag(t, {
      href: `/tags/${encodeURIComponent(t.tagId)}/${encodeURIComponent(author)}`
    })

    const usedByYou = ScuttleTag.obs.allTagsFrom(myId)
    const mostActive = map(ScuttleTag.obs.mostActive(), ([id, count]) => id)
    const recent = ScuttleTag.obs.recent()
    const showMostActive = Value(true)
    const community = when(showMostActive, mostActive, recent)
    const filteredCommunity = computed([community, usedByYou], (a, b) =>
      filter(a, t => b.indexOf(t) < 0))

    const tagsUsedByYou = map(usedByYou, Tag)
    const communityTags = map(filteredCommunity, Tag)

    const name = tagId === 'all' ? i18n('All Tags') : api.about.obs.name(tagId)
    const taggedMessages = MutantArray([])
    let messageStream
    if (tagId === 'all' && author === 'all') {
      messageStream = ScuttleTag.pull.messagesTagged()
    } else if (tagId === 'all' && author !== 'all') {
      messageStream = ScuttleTag.pull.messagesTaggedBy(author)
    } else if (tagId !== 'all' && author === 'all') {
      messageStream = ScuttleTag.pull.messagesTaggedWith(tagId)
    } else {
      messageStream = ScuttleTag.pull.messagesTaggedWithBy(tagId, author)
    }
    pull(
      messageStream,
      pull.map(api.message.obs.get),
      pull.drain((msg) => taggedMessages.push(msg))
    )

    return h('SplitView -tags', [
      h('div.side', [
        h('h2', i18n('Tags Used By You')),
        map(tagsUsedByYou, tag => computed(tag, HtmlTag)),
        h('div.heading', [
          h('h2', i18n('Community Tags')),
          h('span.tagInfo', when(showMostActive, i18n('(most active)'), i18n('(recent)')))
        ]),
        h('div.tagControls', [
          h('button.mostActive', {
            'ev-click': () => showMostActive.set(true)
          }, i18n('Most Active')),
          h('button.recent', {
            'ev-click': () => showMostActive.set(false)
          }, i18n('Recent'))
        ]),
        map(communityTags, tag => computed(tag, HtmlTag))
      ]),
      h('div.main', [
        h('Scroller',
          h('div.wrapper', [
            h('TagsHeader', [
              h('h1', name),
              h('span.tagInfo', author === 'all' ? i18n('(from everyone)') : i18n('(from you)')),
              h('div.tagControls', [
                h('button.you', {
                  'ev-click': () => api.app.navigate(
                    `/tags/${encodeURIComponent(tagId)}/${encodeURIComponent(myId)}`)
                }, i18n('From You')),
                h('button.all', {
                  'ev-click': () => api.app.navigate(`/tags/${encodeURIComponent(tagId)}/all`)
                }, i18n('From Everyone'))
              ])
            ]),
            h('section.messages', [
              map(taggedMessages, msg =>
                computed(msg, msg => {
                  if (msg && !msg.value.missing) {
                    return h('FeedEvent', api.message.html.render(msg))
                  }
                }))
            ])
          ])
        )
      ])
    ])
  })
}
