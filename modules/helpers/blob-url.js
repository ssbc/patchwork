exports.needs = {
  config: 'first'
}

exports.gives = {
  helpers: { blob_url: true }
}

exports.create = function (api) {
  return {
    helpers: {
      blob_url (link) {
        var config = api.config()
        var prefix = config.blobsPrefix != null ? config.blobsPrefix : `http://localhost:${config.blobsPort}`
        if (typeof link.link === 'string') {
          link = link.link
        }
        return `${prefix}/${encodeURIComponent(link)}`
      }
    }
  }
}
