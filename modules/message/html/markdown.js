const renderer = require('ssb-markdown')
const h = require('mutant/h')
const ref = require('ssb-ref')
const nest = require('depnest')
var htmlEscape = require('html-escape')
var watch = require('mutant/watch')
const querystring = require('querystring')
const nodeEmoji = require('node-emoji')

exports.needs = nest({
  'blob.sync.url': 'first',
  'blob.obs.has': 'first'
})

exports.gives = nest('message.html.markdown')

exports.create = function (api) {
  return nest('message.html.markdown', markdown)

  function markdown (content, { classList } = {}) {
    if (typeof content === 'string') { content = { text: content } }
    var mentions = {}
    var typeLookup = {}
    var emojiMentions = {}
    if (Array.isArray(content.mentions)) {
      content.mentions.forEach(function (link) {
        if (link && link.link && link.type) {
          typeLookup[link.link] = link.type
        }
        if (link && link.name && link.link) {
          if (link.emoji) {
            // handle custom emoji
            emojiMentions[link.name] = link.link
          } else {
            // handle old-style patchwork v2 mentions (deprecated)
            mentions['@' + link.name] = link.link
          }
        }
      })
    }

    return h('Markdown', {
      classList,
      hooks: [
        LoadingBlobHook(api.blob.obs.has)
      ],
      innerHTML: renderer.block(content.text, {
        emoji: (emoji) => {
          if (emojiMentions[emoji]) {
            return renderEmoji(emoji, api.blob.sync.url(emojiMentions[emoji]))
          } else {
            return `<span class="Emoji">${nodeEmoji.get(emoji)}</span>`
          }
        },
        toUrl: (id) => {
          var link = ref.parseLink(id)
          if (link && ref.isBlob(link.link)) {
            var url = api.blob.sync.url(link.link)
            var query = {}
            if (link.query && link.query.unbox) query['unbox'] = link.query.unbox
            if (typeLookup[link.link]) query['contentType'] = typeLookup[link.link]
            return url + '?' + querystring.stringify(query)
          } else if (link || id.startsWith('#') || id.startsWith('?')) {
            return id
          } else if (mentions[id]) {
            // handle old-style patchwork v2 mentions (deprecated)
            return mentions[id]
          }
          return false
        },
        imageLink: (id) => id
      })
    })
  }

  function renderEmoji (emoji, url) {
    if (!url) return ':' + emoji + ':'

    return `
      <img
        src="${htmlEscape(url)}"
        alt=":${htmlEscape(emoji)}:"
        title=":${htmlEscape(emoji)}:"
        class="emoji"
      >
    `
  }
}

function LoadingBlobHook (hasBlob) {
  return function (element) {
    var releases = []
    element.querySelectorAll('img').forEach(img => {
      var id = ref.extract(img.src)
      if (id) {
        releases.push(watch(hasBlob(id), has => {
          if (has === false) {
            img.classList.add('-pending')
          } else {
            img.classList.remove('-pending')
          }
        }))
      }
    })
    return function () {
      while (releases.length) {
        releases.pop()()
      }
    }
  }
}
