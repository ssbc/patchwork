module.exports = ExpanderHook

function ExpanderHook (needsExpand) {
  return expander.bind(null, needsExpand)
}

function expander (needsExpand, element) {
  var handler = { handleEvent, needsExpand, element }
  handleEvent.call(handler)

  if (element.querySelector('img')) {
    // just in case images are still loading
    setTimeout(handleEvent.bind(handler), 200)
    element.addEventListener('mouseover', handler)
    return element.removeEventListener.bind(element, 'mouseover', handler)
  }
}

function handleEvent (ev) {
  var { needsExpand, element } = this
  if (!needsExpand()) {
    if (element.firstElementChild.clientHeight + 5 > element.clientHeight) {
      needsExpand.set(true)
    }
  }
}
