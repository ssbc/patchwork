const nest = require('depnest')
const isBlog = require('scuttle-blog/isBlog')
const { h, when, resolve } = require('mutant')

exports.gives = nest('message.html', {
  canRender: true,
  render: true
})

exports.needs = nest({
  'about.obs.color': 'first',
  'app.navigate': 'first',
  'blob.sync.url': 'first',
  'message.html.decorate': 'reduce',
  'message.html.layout': 'first',
  'message.html.markdown': 'first',
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  return nest('message.html', {
    render: blogRenderer,
    canRender
  })

  function blogRenderer (msg, opts) {
    if (!canRender(msg)) return

    var content = null
    // show a card (if there's no body loaded) or the full blog (if the blog body is loaded)
    // msg is decorated with a `body` attribute when loaded using feed.obs.thread from patchcore
    if (msg.body) {
      content = h('BlogFull.Markdown', [
        h('h1', msg.value.content.title),
        api.message.html.markdown(msg.body)
      ])
    } else {
      content = BlogCard({
        blog: msg.value.content,
        onClick: () => api.app.navigate(msg.key),
        color: api.about.obs.color,
        blobUrl: api.blob.sync.url
      })
    }

    const element = api.message.html.layout(msg, Object.assign({}, {
      content,
      layout: 'default'
    }, opts))

    return api.message.html.decorate(element, { msg })
  }
}

function BlogCard ({ blog, blobUrl, onClick, color }) {
  const thumbnail = when(blog.thumbnail,
    h('Thumbnail', {
      style: {
        'background-image': `url("${blobUrl(resolve(blog.thumbnail))}")`,
        'background-position': 'center',
        'background-size': 'cover'
      }
    }),
    h('Thumbnail -empty', {
      style: { 'background-color': color(blog.title) }
    }, [
      h('i.fa.fa-file-text-o')
    ])
  )

  var b = h('BlogCard', { 'ev-click': onClick }, [
    // h('div.context', [
    //   api.about.html.avatar(author, 'tiny'),
    //   h('div.name', api.about.obs.name(author)),
    //   api.message.html.timeago(blog)
    // ]),
    h('div.content', [
      thumbnail,
      h('div.text.Markdown', [
        h('h1', blog.title),
        // when(blog.channel, api.message.html.channel(blog.channel))
        h('div.summary', blog.summary),
        h('div.read', 'Read blog')
      ])
    ])
  ])

  return b
}

function canRender (msg) {
  if (isBlog(msg)) return true
}
