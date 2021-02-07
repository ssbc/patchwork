module.exports = function (element, { msg }) {
  // accessed from lib/context-menu-and-spellcheck
  element.msg = { key: msg.key }
  return element
}
