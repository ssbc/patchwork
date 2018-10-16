var fs = require('fs')

var paths = [
  require.resolve('flatpickr/dist/flatpickr.css')
]

var css = paths.map(function (path) {
  return fs.readFileSync(path, 'utf8')
})

module.exports = css
