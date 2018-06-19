const { Value, Array: MutantArray, onceTrue, computed, map, when, h } = require('mutant')
const nest = require('depnest')
const TagHelper = require('scuttle-tag')
const filter = require('lodash/filter')
const forEach = require('lodash/forEach')

exports.needs = nest({
  'about.obs.name': 'first',
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
    if (!path.startsWith('/tags')) return
    const urlId = path.substr(6)
    const currentTagId = urlId && decodeURIComponent(urlId)
    const myId = api.keys.sync.id()
    const ScuttleTag = TagHelper(api.sbot.obs.connection)
    const Tag = tagId => ScuttleTag.obs.Tag(tagId, api.about.obs.name)
    const HtmlTag = api.tag.html.tag

    const usedByYou = ScuttleTag.obs.allTagsFrom(myId)
    const mostActive = map(ScuttleTag.obs.mostActive(), ([tagId, count]) => tagId)
    const recent = ScuttleTag.obs.recent()

    const showMostActive = Value(true)
    const community = when(showMostActive, mostActive, recent)
    const filteredCommunity = computed([community, usedByYou], (a, b) =>
      filter(a, t => b.indexOf(t) < 0))

    const tagsUsedByYou = map(usedByYou, Tag)
    const communityTags = map(filteredCommunity, Tag)

    const name = currentTagId ? api.about.obs.name(currentTagId) : i18n('All Tags')
    const viewTagsFromAll = Value(false)
    const msgIdsTaggedByYou = currentTagId
      ? ScuttleTag.obs.messagesTaggedByWith(myId, currentTagId)
      : ScuttleTag.obs.messagesTaggedBy(myId)
    const messagesTaggedByYou = map(msgIdsTaggedByYou, api.message.obs.get)
    const messagesTaggedByAll = MutantArray([])
    onceTrue(api.sbot.obs.connection, sbot => {
      const handleData = (err, data) => {
        if (err) return
        forEach(data, msgId => messagesTaggedByAll.push(api.message.obs.get(msgId)))
      }
      if (currentTagId) sbot.tags.getMessagesTaggedWith(currentTagId, handleData)
      else sbot.tags.getTaggedMessages(handleData)
    })

    return h('SplitView', [
      h('div.side', [
        h('h2', i18n('Tags Used By You')),
        map(tagsUsedByYou, tag => computed(tag, t => HtmlTag(t, { linkToTag: true }))),
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
        map(communityTags, tag =>
          computed(tag, t => HtmlTag(t, { linkToTag: true })))
      ]),
      h('div.main', [
        h('Scroller',
          h('div.wrapper', [
            h('section.header', [
              h('h1', name),
              h('span.tagInfo', when(viewTagsFromAll, i18n('(from everyone)'), i18n('(from you)'))),
              h('div.tagControls', [
                h('button.you', {
                  'ev-click': () => viewTagsFromAll.set(false)
                }, i18n('From You')),
                h('button.all', {
                  'ev-click': () => viewTagsFromAll.set(true)
                }, i18n('From Everyone'))
              ])
            ]),
            h('section.messages', [
              map(when(viewTagsFromAll, messagesTaggedByAll, messagesTaggedByYou), msg =>
                computed(msg, msg => {
                  if (msg && !msg.value.missing) {
                    return h('div.messagewrapper', api.message.html.render(msg))
                  }
                }))
            ])
          ])
        )
      ])
    ])
  })
}
