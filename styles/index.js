const base = require('./base')

module.exports = {
  light: require('./light'),
  dark: require('./dark'),
  diffDark: base + require('./diff-dark'),
  diffLight: base + require('./diff-light'),
}
