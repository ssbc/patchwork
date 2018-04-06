const nest = require('depnest')
const Blog = require('scuttle-blog')
const isBlog = require('scuttle-blog/isBlog')
const { h, Value, computed, when, resolve } = require('mutant')

exports.gives = nest('message.html.render')

exports.needs = nest({
  'about.obs.color': 'first',
  'blob.sync.url': 'first',
  'message.html.decorate': 'reduce',
  'message.html.layout': 'first',
  'message.html.markdown': 'first',
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  return nest('message.html.render', blogRenderer)

  function blogRenderer (msg, opts) {
    if (!isBlog(msg)) return

    var blog = Blog(api.sbot.obs.connection).obs.get(msg)
    var showBlog = Value(false)
    // var showBlog = Value(true)

    const element = api.message.html.layout(msg, Object.assign({}, {
      content: when(showBlog,
        BlogFull(blog, api.message.html.markdown),
        BlogCard({
          blog,
          onClick: () => showBlog.set(true),
          color: api.about.obs.color,
          blobUrl: api.blob.sync.url
        })
        // Sample(blog, api.blob.sync.url, showBlog)
      ),
      layout: 'default'
    }, opts))

    return api.message.html.decorate(element, { msg })
  }
}

function BlogFull (blog, renderMd) {
  return computed(blog.body, body => {
    if (body && body.length) {
      return h('BlogFull.Markdown', [
        h('h1', blog.title),
        renderMd(body)
      ])
    }

    return h('BlogFull.Markdown', [
      h('h1', blog.title),
      blog.summary,
      h('p', 'loading...')
    ])
  })
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
