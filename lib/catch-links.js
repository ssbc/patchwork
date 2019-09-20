
module.exports = function (root, cb) {
  root.addEventListener('click', (ev) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) {
      return true
    }

    let anchor = null
    for (let n = ev.target; n.parentNode; n = n.parentNode) {
      if (n.nodeName === 'A') {
        anchor = n
        break
      }
    }
    if (!anchor) return true

    let href = anchor.getAttribute('href')

    if (typeof href === 'string' && href.startsWith('#')) {
      try {
        href = decodeURIComponent(href)
      } catch (e) {
        // Safely ignore error because href isn't URI-encoded.
      }
    }

    if (href) {
      let isUrl
      let url

      try {
        url = new URL(href)
        isUrl = true
      } catch (e) {
        isUrl = false
      }

      if (isUrl && (url.host || url.protocol === 'magnet:')) {
        cb(href, true)
      } else if (href !== '#') {
        cb(href, false, anchor.anchor)
      }
    }

    ev.preventDefault()
    ev.stopPropagation()
  })
}
