var h = require('mutant/h')
var when = require('mutant/when')
var send = require('mutant/send')
var resolve = require('mutant/resolve')
var Value = require('mutant/value')
var computed = require('mutant/computed')
var nest = require('depnest')
var mentions = require('ssb-mentions')
var extend = require('xtend')

exports.needs = nest({
  'blob.html.input': 'first',
  'message.async.publish': 'first'
})

exports.gives = nest('message.html.compose')

exports.create = function (api) {
  return nest('message.html.compose', function ({shrink = true, meta, prepublish, placeholder = 'Write a message'}, cb) {
    var files = []
    var filesById = {}
    var focused = Value(false)
    var hasContent = Value(false)
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
      placeholder
    })

    var fileInput = api.blob.html.input(file => {
      files.push(file)
      filesById[file.link] = file

      var embed = file.type.indexOf('image/') === 0 ? '!' : ''

      textArea.value += embed + `[${file.name}](${file.link})`
      console.log('added:', file)
    })

    fileInput.onclick = function () {
      hasContent.set(true)
    }

    var publishBtn = h('button', { 'ev-click': publish }, 'Publish')

    var actions = h('section.actions', [
      fileInput,
      publishBtn
    ])

    var composer = h('Compose', {
      classList: [
        when(expanded, '-expanded', '-contracted')
      ]
    }, [
      textArea,
      actions
    ])

    return composer

    // scoped

    function publish () {
      publishBtn.disabled = true

      meta = extend(resolve(meta), {
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
          meta = prepublish(meta)
        }
      } catch (err) {
        publishBtn.disabled = false
        if (cb) cb(err)
        else throw err
      }

      return api.message.async.publish(meta, done)

      function done (err, msg) {
        publishBtn.disabled = false
        if (err) throw err
        else if (msg) textArea.value = ''
        if (cb) cb(err, msg)
      }
    }
  })
}
