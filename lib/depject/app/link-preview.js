const { h, Value, computed } = require('mutant')
const ObserveLinkHover = require('../../observe-link-hover')
const ref = require('ssb-ref')

const nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'profile.html.preview': 'first',
  'channel.html.preview': 'first'
})

exports.gives = nest('app.linkPreview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('app.linkPreview', function (container) {
    const currentHover = ObserveLinkHover(container, (value, lastValue) => {
      const href = value && value.getAttribute('href')
      const oldHref = lastValue && lastValue.getAttribute('href')

      let delay = 500
      if (href && oldHref) {
        delay = 100
      } else if (!value) {
        delay = 200
      }

      return delay
    })
    const previewElement = Value()

    // hide preview on scroll
    const hasPreview = computed(previewElement, x => !!x)
    hasPreview(value => {
      if (value) {
        window.addEventListener('wheel', previewElement.cancel)
      } else {
        window.removeEventListener('wheel', previewElement.cancel)
      }
    })

    currentHover(element => {
      const href = element && element.getAttribute('href')
      let preview = null

      if (href) {
        if (ref.isFeed(href)) {
          preview = api.profile.html.preview(href)
        } else if (href.includes('://') || href.startsWith('magnet:')) {
          preview = h('ProfilePreview', [
            h('section', [
              h('strong', [i18n('External Link'), ' 🌐']), h('br'),
              h('code', href)
            ])
          ])
        } else if (href.startsWith('#') && ref.normalizeChannel(href)) {
          preview = api.channel.html.preview(href.slice(1))
        }
      }

      if (preview) {
        const rect = element.getBoundingClientRect()
        const width = 510
        const maxLeft = window.innerWidth - width
        const maxTop = window.innerHeight - 100
        const distanceFromRight = window.innerWidth - rect.right
        const shouldDisplayBeside = rect.bottom > maxTop || rect.left < 50 || distanceFromRight < 50

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
