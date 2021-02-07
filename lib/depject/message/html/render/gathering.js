const { h, computed, when, map, send } = require('mutant')
const nest = require('depnest')
const extend = require('xtend')
const moment = require('moment-timezone')
const addContextMenu = require('../../../../message/html/decorate/context-menu')

exports.needs = nest({
  'message.html.markdown': 'first',
  'message.html.layout': 'first',
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'about.html.image': 'first',
  'about.obs.latestValue': 'first',
  'about.obs.socialValues': 'first',
  'about.obs.valueFrom': 'first',
  'about.obs.name': 'first',
  'contact.obs.following': 'first',
  'blob.sync.url': 'first',
  'gathering.sheet.edit': 'first'
})

exports.gives = nest('message.html', {
  canRender: true,
  render: true
})

exports.create = function (api) {
  let following = null

  return nest('message.html', {
    canRender: isRenderable,
    render: function (msg, opts) {
      if (!isRenderable(msg)) return

      const yourId = api.keys.sync.id()

      // passed in from sbot/public-feed/roots
      const suppliedGathering = msg.gathering || {}

      // allow override of resolved about messages for preview in modules/gathering/sheet/edit.js
      const about = msg.key
        ? extend({
            hidden: api.about.obs.valueFrom(msg.key, 'hidden', yourId),
            image: suppliedGathering.image || api.about.obs.latestValue(msg.key, 'image'),
            title: suppliedGathering.title || api.about.obs.latestValue(msg.key, 'title'),
            description: suppliedGathering.description || api.about.obs.latestValue(msg.key, 'description'),
            location: suppliedGathering.location || api.about.obs.latestValue(msg.key, 'location'),
            startDateTime: suppliedGathering.startDateTime || api.about.obs.latestValue(msg.key, 'startDateTime')
          }, msg.previewAbout)
        : msg.previewAbout

      const attendees = msg.key ? computed([api.about.obs.socialValues(msg.key, 'attendee')], getAttendees) : []
      const disableActions = !!msg.previewAbout

      const attending = computed([attendees, yourId], (attendees, yourId) => attendees.includes(yourId))

      if (!following) {
        following = api.contact.obs.following(yourId)
      }

      const imageUrl = computed(about.image, (id) => api.blob.sync.url(id))
      const imageId = computed(about.image, (link) => (link && link.link) || link)
      const content = h('GatheringCard', [
        h('div.title', [
          h('a', {
            href: msg.key
          }, about.title),
          h('button', {
            disabled: disableActions,
            'ev-click': send(api.gathering.sheet.edit, msg.key)
          }, 'Edit Details')
        ]),
        h('div.time', computed(about.startDateTime, formatTime)),
        when(about.image, h('a.image', {
          href: imageId,
          style: {
            'background-image': computed(imageUrl, (url) => `url(${url})`)
          }
        })),
        h('div.attending', [
          h('div.title', ['Attendees', ' (', computed([attendees], (x) => x.length), ')']),
          h('div.attendees', [
            map(attendees, (attendee) => {
              return h('a.attendee', {
                href: attendee,
                title: nameAndFollowWarning(attendee)
              }, api.about.html.image(attendee))
            })
          ]),
          h('div.actions', [
            h('button -attend', {
              disabled: computed([attending, disableActions], (...args) => args.some(Boolean)),
              'ev-click': send(publishAttending, msg)
            }, 'Attending'),
            h('button -attend', {
              disabled: disableActions,
              'ev-click': send(publishNotAttending, msg)
            }, 'Can\'t Attend')
          ])
        ]),
        h('div.location', markdown(about.location)),
        when(about.description, h('div.description', markdown(about.description)))
      ])

      const editPreview = msg.previewAbout && msg.key

      const element = api.message.html.layout(msg, extend({
        content,
        miniContent: editPreview ? 'Edited a gathering' : 'Added a gathering',
        actions: !msg.previewAbout,
        layout: 'mini'
      }, opts))

      return addContextMenu(element, {
        msg
      })
    }
  })

  function publishAttending (msg) {
    const yourId = api.keys.sync.id()
    const content = {
      type: 'about',
      about: msg.key,
      attendee: {
        link: yourId
      }
    }

    // what starts in private, stays in private!
    if (msg.value.content.recps) {
      content.recps = msg.value.content.recps
    }

    // publish with confirm
    api.message.async.publish(content)
  }

  function publishNotAttending (msg) {
    const yourId = api.keys.sync.id()
    const content = {
      type: 'about',
      about: msg.key,
      attendee: {
        link: yourId,
        remove: true
      }
    }

    // what starts in private, stays in private!
    if (msg.value.content.recps) {
      content.recps = msg.value.content.recps
    }

    // publish with confirm
    api.message.async.publish(content)
  }

  function nameAndFollowWarning (id) {
    const yourId = api.keys.sync.id()
    return computed([api.about.obs.name(id), id, following], function nameAndFollowWarning (name, id, following) {
      if (id === yourId) {
        return `${name} (you)`
      } else if (following.includes(id)) {
        return `${name}`
      } else {
        return `${name} (not following)`
      }
    })
  }

  function markdown (obs) {
    return computed(obs, (text) => {
      if (typeof text === 'string') return api.message.html.markdown(text)
    })
  }
}

function formatTime (time) {
  if (time && time.epoch) {
    return moment(time.epoch).format('LLLL zz')
  }
}

function getAttendees (lookup) {
  return Object.keys(lookup)
}

function isRenderable (msg) {
  return (msg.value.content.type === 'gathering') ? true : undefined
}
