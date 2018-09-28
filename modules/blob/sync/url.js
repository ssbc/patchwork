var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'config.sync.load': 'first'
})

exports.gives = nest('blob.sync.url')

exports.create = function (api) {
  return nest('blob.sync.url', function (link) {
    var config = api.config.sync.load()
    var prefix = config.blobsPrefix != null ? config.blobsPrefix : `http://localhost:${config.ws.port}/blobs/get`
    if (link && typeof link.link === 'string') {
      link = link.link
    }

    var parsed = ref.parseLink(link)
    if (parsed && ref.isBlob(parsed.link)) {
      return `${prefix}/${parsed.link}`
    }
  })
}
