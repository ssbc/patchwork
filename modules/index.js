var SbotApi = require('../api')
var extend = require('xtend')
var combine = require('depject')
var fs = require('fs')
var patchbayModules = require('patchbay/modules')

module.exports = function (config, ssbClient, overrides) {
  var api = SbotApi(ssbClient, config)
  var localModules = getLocalModules()
  return combine(extend(patchbayModules, localModules, {
    'sbot-api.js': api,
    'blob-url.js': {
      blob_url: function (link) {
        var prefix = config.blobsPrefix != null ? config.blobsPrefix : `http://localhost:${config.blobsPort}`
        if (typeof link.link === 'string') {
          link = link.link
        }
        return `${prefix}/${encodeURIComponent(link)}`
      }
    }
  }, overrides))
}

function getLocalModules () {
  return fs.readdirSync(__dirname).reduce(function (result, e) {
    if (e !== 'index.js' && /\js$/.test(e)) {
      result[e] = require('./' + e)
    }
    return result
  }, {})
}
