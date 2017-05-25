var nest = require('depnest')

exports.needs = nest({
  'config.sync.load': 'first'
})

exports.gives = nest('blob.sync.url')

exports.create = function (api) {
  return nest('blob.sync.url', function (link) {
    var config = api.config.sync.load()
    var prefix = config.blobsPrefix != null ? config.blobsPrefix : `http://localhost:${config.blobsPort}`
    if (link && typeof link.link === 'string') {
      link = link.link
    }
    return `${prefix}/${encodeURIComponent(link)}`
  })
}
