var h = require('hyperscript')

function idLink (id) {
  return h('a', {href:'#'+id}, id.slice(0, 10))
}

function asLink (ln) {
  return 'string' === typeof ln ? ln : ln.link
}

var plugs = require('patchbay/plugs')
var blob_url = plugs.first(exports.blob_url = [])
var avatar_name = plugs.first(exports.avatar_name = [])
var avatar_link = plugs.first(exports.avatar_link = [])

exports.message_content = function (msg) {
  if(msg.value.content.type !== 'about' || !msg.value.content.about) return

  if(!msg.value.content.image && !msg.value.content.name)
    return

  var about = msg.value.content
  var id = msg.value.content.about
  return h('p',
    about.about === msg.value.author
      ? h('span', 'self-identifies ')
      : h('span', 'identifies ', about.name ? idLink(id) : avatar_link(id, avatar_name(id))),
    ' as ',
    h('a', {href:"#"+about.about},
      about.name || null,
      about.image
      ? h('img.avatar--fullsize', {src: blob_url(about.image)})
      : null
    )
  )

}
