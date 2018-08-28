const light = require('./light')
const diffDark = require('./diff-dark')

module.exports = {
  light: light,
  dark: require('./dark'),
  diffDark: light + diffDark
}
