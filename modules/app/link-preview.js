var { h, Value } = require('mutant')
var ObserveLinkHover = require('../../lib/observe-link-hover')
var ref = require('ssb-ref')

var nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'profile.html.preview': 'first'
})

exports.gives = nest('app.linkPreview')

exports.create = function (api) {
  var i18n = api.intl.sync.i18n
  return nest('app.linkPreview', function (container, delay) {
    var currentHover = ObserveLinkHover(container, 500)
    var previewElement = Value()
    previewElement(currentHover.active.set)

    currentHover(element => {
      var href = element && element.getAttribute('href')
      var preview = null

      if (href) {
        if (ref.isFeed(href)) {
          preview = api.profile.html.preview(href)
        } else if (href.includes('://')) {
          preview = h('ProfilePreview', [
            h('section', [
              h('strong', [i18n('External Link'), ' 🌐']), h('br'),
              h('code', href)
            ])
          ])
        }
      }

      if (preview) {
        var rect = element.getBoundingClientRect()
        var width = 510
        var maxLeft = window.innerWidth - width
        var maxTop = window.innerHeight - 100
        var distanceFromRight = window.innerWidth - rect.right
        var shouldDisplayBeside = rect.bottom > maxTop || rect.left < 50 || distanceFromRight < 50

        if (shouldDisplayBeside && rect.bottom > 50) {
          if (rect.right > maxLeft && (rect.left - width) < 0) {
            // no room, just give up!
            previewElement.set(null)
            return
          } else {
            preview.style.top = `${Math.min(rect.top, maxTop)}px`
            if (rect.right > maxLeft) {
              preview.style.left = `${rect.left - width}px`
            } else {
              preview.style.left = `${rect.right + 5}px`
            }
          }
        } else {
          preview.style.top = `${rect.bottom + 5}px`
          preview.style.left = `${Math.min(rect.left, maxLeft)}px`
        }

        previewElement.set(preview)
      } else if (element !== false) {
        previewElement.set(null)
      }
    })

    previewElement.cancel = function () {
      currentHover.cancel()
      previewElement.set(null)
    }

    return previewElement
  })
}
