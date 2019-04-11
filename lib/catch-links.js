      
module.exports = function (root, cb) {
  root.addEventListener('click', (ev) => {

    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) {
      return true
    }

    var anchor = null
    for (var n = ev.target; n.parentNode; n = n.parentNode) {
      if (n.nodeName === 'A') {
        anchor = n
        break
      }
    }
    if (!anchor) return true

    var href = anchor.getAttribute('href')

    if (href) {
      var isUrl

      try {
        var url = new URL(href)
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
