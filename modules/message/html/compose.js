var h = require('mutant/h')
var when = require('mutant/when')
var send = require('mutant/send')
var resolve = require('mutant/resolve')
var Value = require('mutant/value')
var computed = require('mutant/computed')
var nest = require('depnest')
var mentions = require('ssb-mentions')
var extend = require('xtend')
var addSuggest = require('suggest-box')
var emoji = require('emojilib')

exports.needs = nest({
  'blob.html.input': 'first',
  'profile.async.suggest': 'first',
  'channel.async.suggest': 'first',
  'message.async.publish': 'first',
  'emoji.sync.names': 'first',
  'emoji.sync.url': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html.compose')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html.compose', function ({shrink = true, isPrivate, participants, meta, hooks, prepublish, placeholder = 'Write a message'}, cb) {
    var files = []
    var filesById = {}
    var focused = Value(false)
    var hasContent = Value(false)
    var publishing = Value(false)
    var getProfileSuggestions = api.profile.async.suggest()
    var getChannelSuggestions = api.channel.async.suggest()

    var blurTimeout = null

    var expanded = computed([shrink, focused, hasContent], (shrink, focused, hasContent) => {
      if (!shrink || hasContent) {
        return true
      } else {
        return focused
      }
    })

    var textArea = h('textarea', {
      'ev-input': function () {
        hasContent.set(!!textArea.value)
      },
      'ev-blur': () => {
        clearTimeout(blurTimeout)
        blurTimeout = setTimeout(() => focused.set(false), 200)
      },
      'ev-focus': send(focused.set, true),
      disabled: publishing,
      placeholder
    })

    var warningMessage = Value(null)
    var warning = h('section.warning',
      { className: when(warningMessage, '-open', '-closed') },
      [
        h('div.warning', warningMessage),
        h('div.close', { 'ev-click': () => warningMessage.set(null) }, 'x')
      ]
    )
    var fileInput = api.blob.html.input(file => {
      const megabytes = file.size / 1024 / 1024
      if (megabytes >= 5) {
        const rounded = Math.floor(megabytes * 100) / 100
        warningMessage.set([
          h('i.fa.fa-exclamation-triangle'),
          h('strong', file.name),
          ` is ${rounded}MB - the current limit is 5MB`
        ])
        return
      }

      files.push(file)
      filesById[file.link] = file

      var embed = file.type.indexOf('image/') === 0 ? '!' : ''
      var pos = textArea.selectionStart
      var before = textArea.value.slice(0, pos)
      var after = textArea.value.slice(pos)

      var spacer = embed ? '\n' : ' '
      if (before && !before.endsWith(spacer)) before += spacer
      if (!after.startsWith(spacer)) after = spacer + after

      textArea.value = `${before}${embed}[${file.name}](${file.link})${after}`
      console.log('added:', file)
    })

    fileInput.onclick = function () {
      hasContent.set(true)
    }

    var publishBtn = h('button', {
      'ev-click': publish,
      classList: [
        when(isPrivate, '-private')
      ],
      disabled: publishing
    }, when(publishing,
      i18n('Publishing...'),
      when(isPrivate, i18n('Publish Privately'), i18n('Publish'))
    ))

    var actions = h('section.actions', [
      fileInput,
      publishBtn
    ])

    var composer = h('Compose', {
      hooks,
      classList: [
        when(expanded, '-expanded', '-contracted')
      ]
    }, [
      textArea,
      warning,
      actions
    ])

    composer.focus = function () {
      textArea.focus()
    }

    composer.setText = function (value) {
      textArea.value = value
      hasContent.set(!!textArea.value)
    }

    addSuggest(textArea, (inputText, cb) => {
      if (inputText[0] === '@') {
        cb(null, getProfileSuggestions(inputText.slice(1), resolve(participants)))
      } else if (inputText[0] === '#') {
        cb(null, getChannelSuggestions(inputText.slice(1)))
      } else if (inputText[0] === ':') {
        // suggest emojis
        var word = inputText.slice(1)
        if (word[word.length - 1] === ':') {
          word = word.slice(0, -1)
        }
        cb(null, suggestEmoji(word).slice(0, 100).map(function (emoji) {
          return {
            image: api.emoji.sync.url(emoji),
            title: emoji,
            subtitle: emoji,
            value: ':' + emoji + ':'
          }
        }))
      }
    }, {cls: 'SuggestBox'})

    return composer

    // scoped

    function publish () {
      publishing.set(true)

      var content = extend(resolve(meta), {
        text: textArea.value,
        mentions: mentions(textArea.value).map(mention => {
          // merge markdown-detected mention with file info
          var file = filesById[mention.link]
          if (file) {
            if (file.type) mention.type = file.type
            if (file.size) mention.size = file.size
          }
          return mention
        })
      })

      try {
        if (typeof prepublish === 'function') {
          content = prepublish(content)
        }
      } catch (err) {
        return done(err)
      }

      return api.message.async.publish(content, done)

      function done (err, msg) {
        publishing.set(false)
        if (err) {
          if (cb) cb(err)
          else {
            showDialog({
              type: 'error',
              title: i18n('Error'),
              buttons: [i18n('OK')],
              message: i18n('An error occured while publishing your message.'),
              detail: err.message
            })
          }
        } else {
          if (msg) textArea.value = ''
          if (cb) cb(null, msg)
        }
      }
    }
  })

  function suggestEmoji (prefix) {
    var availableEmoji = api.emoji.sync.names()
    return emoji.ordered.filter(key => {
      if (!availableEmoji.includes(key)) return false
      return key.startsWith(prefix) || key.includes('_' + prefix) || emoji.lib[key].keywords.some(word => word.startsWith(prefix) || word.startsWith(':' + prefix))
    })
  }
}

function showDialog (opts) {
  var electron = require('electron')
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
