var { h, Value, computed } = require('mutant')
var ObserveLinkHover = require('../../lib/observe-link-hover')
var ref = require('ssb-ref')

var nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'profile.html.preview': 'first',
  'channel.html.preview': 'first'
})

exports.gives = nest('app.linkPreview')

exports.create = function (api) {
  var i18n = api.intl.sync.i18n
  return nest('app.linkPreview', function (container, delay) {
    var currentHover = ObserveLinkHover(container, (value, lastValue) => {
      var href = value && value.getAttribute('href')
      var oldHref = lastValue && lastValue.getAttribute('href')

      var delay = 500
      if (href && oldHref) {
        delay = 100
      } else if (!value) {
        delay = 200
      }

      return delay
    })
    var previewElement = Value()

    // hide preview on scroll
    var hasPreview = computed(previewElement, x => !!x)
    hasPreview(value => {
      if (value) {
        window.addEventListener('wheel', previewElement.cancel)
      } else {
        window.removeEventListener('wheel', previewElement.cancel)
      }
    })

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
        } else if (href.startsWith('#') && href.length > 1) {
          preview = api.channel.html.preview(href.slice(1))
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
