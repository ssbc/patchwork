var h = require('hyperscript')
var plugs = require('patchbay/plugs')
var message_link = plugs.first(exports.message_link = [])
var markdown = plugs.first(exports.markdown = [])

exports.message_content = function (data) {
  if(!data.value.content || !data.value.content.text) return

  return h('div',
    markdown(data.value.content)
  )

}
