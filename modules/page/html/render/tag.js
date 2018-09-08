const { Value, Array: MutantArray, computed, map, when, h } = require('mutant')
const nest = require('depnest')
const pull = require('pull-stream')
const get = require('lodash/get')
const concat = require('lodash/concat')
const filter = require('lodash/filter')
const sortBy = require('lodash/sortBy')
const flow = require('lodash/fp/flow')
const fpFilter = require('lodash/fp/filter')
const fpSortBy = require('lodash/fp/sortBy')
const fpReverse = require('lodash/fp/reverse')
const fpReduce = require('lodash/fp/reduce')
const fpMap = require('lodash/fp/map')
const fpMapValues = require('lodash/fp/mapValues')
const fpToPairs = require('lodash/fp/toPairs')
const ScuttleTag = require('scuttle-tag')

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
    const scuttleTag = ScuttleTag(api.sbot.obs.connection)
    const showMostActive = Value(parts[4] !== 'recent')

    const usedByYou = scuttleTag.obs.allTagsFrom(myId)
    const mostActive = map(scuttleTag.obs.mostActive(), ([id, count]) => id, {
      comparer: (a, b) => {
        if (Array.isArray(a) && Array.isArray(b)) {
          return a[0] === b[0] && a[1] === b[1]
        }
      }
    })
    const recent = scuttleTag.obs.recent()
    const community = when(showMostActive, mostActive, recent)
    const filteredCommunity = computed([community, usedByYou], (a, b) =>
      a.filter(c => !b.includes(c)))

    const name = tagId === 'all' ? i18n('All Tags') : api.about.obs.name(tagId)
    let tagStream
    if (tagId === 'all' && author === 'all') {
      tagStream = scuttleTag.pull.allTags({ live: true })
    } else if (tagId === 'all' && author !== 'all') {
      tagStream = scuttleTag.pull.tagsFrom(author, { live: true })
    } else if (tagId !== 'all' && author === 'all') {
      tagStream = scuttleTag.pull.tagsOf(tagId, { live: true })
    } else {
      tagStream = scuttleTag.pull.tagsOfFrom(tagId, author, { live: true })
    }
    const sync = Value(false)
    const newTags = MutantArray()
    const updateCount = computed(newTags, tags => tags.length)
    const tagsArray = MutantArray([])
    const taggedMessages = computed(tagsArray, tags => flow(
      fpReduce((result, tag) => {
        const root = get(tag, 'value.content.root')
        const tagged = get(tag, 'value.content.tagged')
        const message = get(tag, 'value.content.message')
        const messageTags = get(result, message) || []
        if (!tagged) {
          result[message] = filter(messageTags, messageTag =>
            get(messageTag, 'value.content.root') !== root
          )
        } else {
          result[message] = concat(messageTags, [tag])
        }
        return result
      }, {}),
      fpMapValues(messageTags => sortBy(messageTags, ['value', 'timestamp'])),
      fpToPairs,
      fpFilter(([message, messageTags]) => messageTags.length > 0),
      fpSortBy(([message, messageTags]) => {
        const lastTag = messageTags[messageTags.length - 1]
        return get(lastTag, ['value', 'timestamp'])
      }),
      fpReverse,
      fpMap(([message]) => api.message.obs.get(message))
    )(tags))
    pull(
      tagStream,
      pull.drain(tag => {
        if (tag.sync) sync.set(true)
        if (sync()) {
          newTags.push(tag)
        } else {
          tagsArray.push(tag)
        }
      })
    )

    const refresh = () => {
      newTags.forEach(tag => tagsArray.push(tag))
      newTags.clear()
    }

    const updateLoader = h('a Notifier -loader', { href: '#', 'ev-click': refresh }, [
      'Show ',
      h('strong', [updateCount]),
      ' ',
      computed(updateCount, count => count === 1 ? i18n('update') : i18n('updates'))
    ])

    return h('SplitView -tags', [
      h('div.side', [
        h('h2', i18n('Tags Used By You')),
        map(usedByYou, tag => computed(tag, tagId => api.tag.html.tag(tagId, {
          href: `/tags/${encodeURIComponent(tagId)}/${encodeURIComponent(myId)}`
        }))),
        h('h2', i18n('Community Tags')),
        h('div.tagControls', [
          h('button.mostActive', {
            'ev-click': () => showMostActive.set(true),
            className: computed(showMostActive, mostActive =>
              mostActive ? '-filterSelected' : '-filterUnselected')
          }, i18n('Most Active')),
          h('button.recent', {
            'ev-click': () => showMostActive.set(false),
            className: computed(showMostActive, mostActive =>
              mostActive ? '-filterUnselected' : '-filterSelected')
          }, i18n('Recent'))
        ]),
        map(filteredCommunity, tag => computed([tag, showMostActive], (tagId, mostActive) => api.tag.html.tag(tagId, {
          href: `/tags/${encodeURIComponent(tagId)}/all/${mostActive ? 'active' : 'recent'}`
        })))
      ]),
      h('div.main', [
        when(updateCount, updateLoader),
        h('Scroller',
          h('div.wrapper', [
            h('TagsHeader', [
              h('h1', name),
              h('div.tagControls', [
                h('button.you', {
                  'ev-click': () => api.app.navigate(
                    `/tags/${encodeURIComponent(tagId)}/${encodeURIComponent(myId)}`),
                  className: author === 'all' ? '-filterUnselected' : '-filterSelected'
                }, i18n('From You')),
                h('button.all', {
                  'ev-click': () => api.app.navigate(`/tags/${encodeURIComponent(tagId)}/all`),
                  className: author === 'all' ? '-filterSelected' : '-filterUnselected'
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
