const renderer = require('ssb-markdown')
const h = require('mutant/h')
const ref = require('ssb-ref')
const nest = require('depnest')
var htmlEscape = require('html-escape')
var watch = require('mutant/watch')
const querystring = require('querystring')

exports.needs = nest({
  'blob.sync.url': 'first',
  'blob.obs.has': 'first',
  'emoji.sync.url': 'first'
})

exports.gives = nest('message.html.markdown')

exports.create = function (api) {
  return nest('message.html.markdown', markdown)

  function markdown (content) {
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
      hooks: [
        LoadingBlobHook(api.blob.obs.has),
        LargeEmojiHook()
      ],
      innerHTML: renderer.block(content.text, {
        emoji: (emoji) => {
          var url = emojiMentions[emoji]
            ? api.blob.sync.url(emojiMentions[emoji])
            : api.emoji.sync.url(emoji)
          return renderEmoji(emoji, url)
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

function LargeEmojiHook () {
  return function (element) {
    // do our best with a css selector
    element.querySelectorAll('p > img.emoji:only-child').forEach(img => {
      // unfortunately `only-child` doesn't take text nodes into account
      // check to see if there is actually any text before or after before adding class
      var before = img.previousSibling && img.previousSibling.textContent.trim()
      var after = img.nextSibling && img.nextSibling.textContent.trim()
      if (!before && !after) {
        img.classList.add('-large')
      }
    })
  }
}
