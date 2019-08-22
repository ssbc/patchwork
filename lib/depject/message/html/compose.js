const h = require('mutant/h')
const when = require('mutant/when')
const resolve = require('mutant/resolve')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const nest = require('depnest')
const mentions = require('ssb-mentions')
const extend = require('xtend')
const ref = require('ssb-ref')
const blobFiles = require('ssb-blob-files')

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
    const files = []
    const filesById = {}
    const focused = Value(false)
    const hasContent = Value(false)
    const publishing = Value(false)

    let blurTimeout = null
    let saveTimer = null

    const expanded = computed([shrink, focused, hasContent], (shrink, focused, hasContent) => {
      if (!shrink || hasContent) {
        return true
      } else {
        return focused
      }
    })

    const textArea = h('textarea', {
      hooks: [api.suggest.hook({ participants })],
      'ev-dragover': onDragOver,
      'ev-drop': onDrop,
      'ev-input': function () {
        refreshHasContent()
        queueSave()
      },
      'ev-blur': () => {
        clearTimeout(blurTimeout)
        blurTimeout = setTimeout(() => focused.set(false), 200)
      },
      'ev-focus': () => {
        clearTimeout(blurTimeout)
        focused.set(true)
      },
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

    const contentWarningInput = h('input.contentWarning', {
      placeholder: 'content warning (optional)',
      'ev-input': function () {
        refreshHasContent()
        queueSave()
      },
      'ev-blur': () => {
        clearTimeout(blurTimeout)
        blurTimeout = setTimeout(() => focused.set(false), 200)
      },
      'ev-focus': () => {
        clearTimeout(blurTimeout)
        focused.set(true)
      }
    })

    if (draftKey) {
      const draft = window.localStorage[`patchwork.drafts.${draftKey}`]
      if (draft) {
        textArea.value = draft
      }
      const draftCW = window.localStorage[`patchwork.drafts.contentWarning.${draftKey}`]
      if (draftCW) {
        contentWarningInput.value = draftCW
      }
      refreshHasContent()
    }

    const warningMessage = Value(null)
    const warning = h('section.warning',
      { className: when(warningMessage, '-open', '-closed') },
      [
        h('div.warning', warningMessage),
        h('div.close', { 'ev-click': () => warningMessage.set(null) }, 'x')
      ]
    )
    const fileInput = api.blob.html.input(afterAttach, {
      private: isPrivate,
      multiple: true
    })

    fileInput.onclick = function () {
      hasContent.set(true)
    }

    const clearButton = h('button -clear', {
      'ev-click': clear
    }, [
      i18n('Clear Draft')
    ])

    const publishBtn = h('button', {
      'ev-click': publish,
      classList: [
        when(isPrivate, '-private')
      ],
      disabled: publishing
    }, when(publishing,
      i18n('Publishing...'),
      when(isPrivate, i18n('Preview & Publish Privately'), i18n('Preview & Publish'))
    ))

    const actions = h('section.actions', [
      fileInput,
      contentWarningInput,
      h('div', [
        when(hasContent, clearButton),
        publishBtn
      ])
    ])

    const composer = h('Compose', {
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
      refreshHasContent()
    }

    return composer

    // scoped

    function clear () {
      if (!window.confirm(i18n('Are you certain you want to clear your draft?'))) {
        return
      }
      textArea.value = ''
      contentWarningInput.value = ''
      refreshHasContent()
      save()
    }

    function refreshHasContent () {
      hasContent.set(!!textArea.value || !!contentWarningInput.value)
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
        if (!contentWarningInput.value) {
          delete window.localStorage[`patchwork.drafts.contentWarning.${draftKey}`]
        } else {
          window.localStorage[`patchwork.drafts.contentWarning.${draftKey}`] = contentWarningInput.value
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
              name: err.fileName,
              size: humanSize(err.fileSize),
              max_size: humanSize(err.maxFileSize)
            })
          ])
        }
        return
      }

      files.push(file)

      const parsed = ref.parseLink(file.link)
      filesById[parsed.link] = file

      const embed = isEmbeddable(file.type) ? '!' : ''
      const pos = textArea.selectionStart
      let before = textArea.value.slice(0, pos)
      let after = textArea.value.slice(pos)

      const spacer = embed ? '\n' : ' '
      if (before && !before.endsWith(spacer)) before += spacer
      if (!after.startsWith(spacer)) after = spacer + after

      const embedPrefix = getEmbedPrefix(file.type)

      textArea.value = `${before}${embed}[${embedPrefix}${file.name}](${file.link})${after}`
      console.log('added:', file)
    }

    function publish () {
      if (!textArea.value) {
        return
      }
      publishing.set(true)

      let content = extend(resolve(meta), {
        text: textArea.value,
        mentions: mentions(textArea.value).map(mention => {
          // merge markdown-detected mention with file info
          const file = filesById[mention.link]
          if (file) {
            if (file.type) mention.type = file.type
            if (file.size) mention.size = file.size
          }
          return mention
        })
      })

      if (contentWarningInput.value) {
        content.contentWarning = contentWarningInput.value
      }

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
              message: i18n('An error occurred while publishing your message.'),
              detail: err.message
            })
          }
        } else {
          if (msg) {
            textArea.value = ''
            contentWarningInput.value = ''
            refreshHasContent()
            save()
          }
          if (cb) cb(null, msg)
        }
      }
    }
  })
}

function showDialog (opts) {
  const electron = require('electron')
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
