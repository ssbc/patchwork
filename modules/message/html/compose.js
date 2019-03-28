var h = require('mutant/h')
var when = require('mutant/when')
var send = require('mutant/send')
var resolve = require('mutant/resolve')
var Value = require('mutant/value')
var computed = require('mutant/computed')
var nest = require('depnest')
var mentions = require('ssb-mentions')
var extend = require('xtend')
var ref = require('ssb-ref')
var blobFiles = require('ssb-blob-files')

exports.needs = nest({
  'blob.html.input': 'first',
  'suggest.hook': 'first',

  'message.async.publish': 'first',
  'sbot.obs.connection': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html.compose')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html.compose', function ({ shrink = true, isPrivate, participants, meta, hooks, prepublish, placeholder = 'Write a message', draftKey }, cb) {
    var files = []
    var filesById = {}
    var focused = Value(false)
    var hasContent = Value(false)
    var publishing = Value(false)

    var blurTimeout = null
    var saveTimer = null

    var expanded = computed([shrink, focused, hasContent], (shrink, focused, hasContent) => {
      if (!shrink || hasContent) {
        return true
      } else {
        return focused
      }
    })

    var textArea = h('textarea', {
      hooks: [api.suggest.hook({ participants })],
      'ev-dragover': onDragOver,
      'ev-drop': onDrop,
      'ev-input': function () {
        hasContent.set(!!textArea.value)
        queueSave()
      },
      'ev-blur': () => {
        clearTimeout(blurTimeout)
        blurTimeout = setTimeout(() => focused.set(false), 200)
      },
      'ev-focus': send(focused.set, true),
      'ev-paste': ev => {
        const files = ev.clipboardData && ev.clipboardData.files
        if (!files || !files.length) return
        attachFiles(files)
      },
      'ev-keydown': ev => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          publish()
          ev.preventDefault()
        }
      },
      disabled: publishing,
      placeholder
    })

    if (draftKey) {
      var draft = window.localStorage[`patchwork.drafts.${draftKey}`]
      if (draft) {
        textArea.value = draft
        hasContent.set(!!textArea.value)
      }
    }

    var warningMessage = Value(null)
    var warning = h('section.warning',
      { className: when(warningMessage, '-open', '-closed') },
      [
        h('div.warning', warningMessage),
        h('div.close', { 'ev-click': () => warningMessage.set(null) }, 'x')
      ]
    )
    var fileInput = api.blob.html.input(afterAttach, {
      private: isPrivate,
      multiple: true
    })

    fileInput.onclick = function () {
      hasContent.set(true)
    }

    var clearButton = h('button -clear', {
      'ev-click': clear
    }, [
      i18n('Clear Draft')
    ])

    var publishBtn = h('button', {
      'ev-click': publish,
      classList: [
        when(isPrivate, '-private')
      ],
      disabled: publishing
    }, when(publishing,
      i18n('Publishing...'),
      when(isPrivate, i18n('Preview & Publish Privately'), i18n('Preview & Publish'))
    ))

    var actions = h('section.actions', [
      fileInput,
      h('div', [
        when(hasContent, clearButton),
        publishBtn
      ])
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

    return composer

    // scoped

    function clear () {
      textArea.value = ''
      hasContent.set(!!textArea.value)
      save()
    }

    function queueSave () {
      saveTimer = setTimeout(save, 1000)
    }

    function save () {
      clearTimeout(saveTimer)
      if (draftKey) {
        if (!textArea.value) {
          delete window.localStorage[`patchwork.drafts.${draftKey}`]
        } else {
          window.localStorage[`patchwork.drafts.${draftKey}`] = textArea.value
        }
      }
    }

    function onDragOver (ev) {
      ev.dataTransfer.dropEffect = 'copy'
      ev.preventDefault()
      return false
    }

    function onDrop (ev) {
      ev.preventDefault()

      const files = ev.dataTransfer && ev.dataTransfer.files
      if (!files || !files.length) return

      ev.dataTransfer.dropEffect = 'copy'
      attachFiles(files)
      return false
    }

    function attachFiles (files) {
      blobFiles(files, api.sbot.obs.connection, {
        stripExif: true,
        isPrivate: resolve(isPrivate)
      }, afterAttach)
    }

    function afterAttach (err, file) {
      if (err) {
        if (err instanceof blobFiles.MaxSizeError) {
          warningMessage.set([
            // TODO: handle localised error messages (https://github.com/ssbc/ssb-blob-files/issues/3)
            '⚠️ ', i18n('{{name}} ({{size}}) is larger than the allowed limit of {{max_size}}', {
              'name': err.fileName,
              'size': humanSize(err.fileSize),
              'max_size': humanSize(err.maxFileSize)
            })
          ])
        }
        return
      }

      files.push(file)

      var parsed = ref.parseLink(file.link)
      filesById[parsed.link] = file

      var embed = isEmbeddable(file.type) ? '!' : ''
      var pos = textArea.selectionStart
      var before = textArea.value.slice(0, pos)
      var after = textArea.value.slice(pos)

      var spacer = embed ? '\n' : ' '
      if (before && !before.endsWith(spacer)) before += spacer
      if (!after.startsWith(spacer)) after = spacer + after

      var embedPrefix = getEmbedPrefix(file.type)

      textArea.value = `${before}${embed}[${embedPrefix}${file.name}](${file.link})${after}`
      console.log('added:', file)
    }

    function publish () {
      if (!textArea.value) {
        return
      }
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
          if (cb) {
            cb(err)
          } else {
            showDialog({
              type: 'error',
              title: i18n('Error'),
              buttons: [i18n('OK')],
              message: i18n('An error occurred while publishing your message.'),
              detail: err.message
            })
          }
        } else {
          if (msg) {
            textArea.value = ''
            hasContent.set(!!textArea.value)
            save()
          }
          if (cb) cb(null, msg)
        }
      }
    }
  })
}

function showDialog (opts) {
  var electron = require('electron')
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}

function isEmbeddable (type) {
  return type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/')
}

function getEmbedPrefix (type) {
  if (typeof type === 'string') {
    if (type.startsWith('audio/')) return 'audio:'
    if (type.startsWith('video/')) return 'video:'
  }
  return ''
}

function humanSize (size) {
  return (Math.ceil(size / (1024 * 1024) * 10) / 10) + ' MB'
}
