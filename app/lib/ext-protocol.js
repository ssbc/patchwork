var protocol = require('protocol')
var path = require('path')
var toPath = require('multiblob/util').toPath

module.exports = function (config) {
  var dir = path.join(config.path, 'blobs')
  return function (request) {
    var id = request.url.split(':')[1]
    if (request.method == 'GET' && id) {
      console.log('loading', id, toPath(dir, id))
      return new protocol.RequestFileJob(toPath(dir, id))
    }
  }
}