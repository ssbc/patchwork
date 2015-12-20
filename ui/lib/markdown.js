'use strict'
var emojiNamedCharacters = require('emoji-named-characters')
var marked = require('ssb-marked')
var ssbref = require('ssb-ref')
var mlib   = require('ssb-msgs')

var blockRenderer = new marked.Renderer()
var inlineRenderer = new marked.Renderer()

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function simpleEscape(html) {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// override to only allow external links or hashes, and correctly link to ssb objects
blockRenderer.urltransform = function (url) {
  var c = url.charAt(0)
  var hasSigil = (c == '@' || c == '&' || c == '%')

  if (this.options.sanitize && !hasSigil) {
    try {
      var prot = decodeURIComponent(unescape(url))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return false;
    }
    if (prot.indexOf('javascript:') === 0) {
      return false;
    }
  }

  var islink = ssbref.isLink(url)
  if (hasSigil && !islink && this.options.mentionNames) {
    // do a name lookup
    url = this.options.mentionNames[url.slice(1)]
    if (!url)
      return false
    islink = true
  }

  if (islink) {
    if (ssbref.isFeedId(url))
      return '#/profile/'+encodeURIComponent(url)
    else if (ssbref.isMsgId(url))
      return '#/msg/'+encodeURIComponent(url)
    else if (ssbref.isBlobId(url))
      return '#/webview/'+encodeURIComponent(url)
  }
  else if (url.indexOf('http') !== 0) {
    return false;
  }
  return url
}

// override to make http/s links external
blockRenderer.link = function(href, title, text) {
  var original = href
  href = this.urltransform(href)
  var out
  if (href !== false) {
    if (href.indexOf('#/webview/') === 0 && (title || text)) // add ?name param if this is a link to a blob
      href += '?name='+encodeURIComponent(title || text)
    out = '<a href="' + href + '"';
  } else
    out = '<a class="bad"'

  // include the ssb-id
  if (ssbref.isLink(original))
    out += ' data-ssb-id="' + original + '"';

  if (title)
    out += ' title="' + title + '"';

  // make a popup if http/s
  if (href && href.indexOf('http') === 0)
    out += ' target="_blank"'

  out += '>' + text + '</a>';
  return out;
};

// overwrite to include `data-ssb-id` attr
blockRenderer.mention = function(preceding, id) {
  var href = this.urltransform(id)

  // shorten the id if it appears to be the full length
  var shortId = id
  if ((id.charAt(0) == '&' || id.charAt(0) == '@' || id.charAt(0) == '%') && id.length > 50)
    shortId = id.slice(0, 8) + '...'

  // lookup the ID if we've been given a mention
  if (!ssbref.isLink(id) && this.options.mentionNames) {
    // do a name lookup
    id = this.options.mentionNames[id.slice(1)]
    if (!id)
      return false
  }

  if (href === false)
    return (preceding||'')+'<a class="bad">'+escape(shortId)+'</a>'
  return (preceding||'')+'<a data-ssb-id="'+id+'" href="'+simpleEscape(href)+'">'+escape(shortId)+'</a>'
}

blockRenderer.image  = function (href, title, text) {
  href = href.replace(/^&amp;/, '&')
  if (ssbref.isLink(href)) {
    var out = '<a data-ssb-id="'+href+'" data-tooltip="' + (title||text) + '" href="#/webview/' + encodeURIComponent(href) + '"><img src="http://localhost:7777/' + href + '?fallback=img" alt="' + text + '" title="' + (title||text) + '"></a>'
    return out
  }
  return text
}

// inline renderer just spits out the text of links and images
inlineRenderer.urltransform = function (url) { return false }
inlineRenderer.link = function (href, title, text) { return unquote(text) }
inlineRenderer.image  = function (href, title, text) { return unquote(text) }
inlineRenderer.code = function(code, lang, escaped) { return unquote(code) }
inlineRenderer.blockquote = function(quote) { return unquote(quote) }
inlineRenderer.html = function(html) { return false }
inlineRenderer.heading = function(text, level, raw) { return '<strong>'+unquote(text)+'</strong> ' }
inlineRenderer.hr = function() { return ' --- ' }
inlineRenderer.br = function() { return ' ' }
inlineRenderer.list = function(body, ordered) { return unquote(body) }
inlineRenderer.listitem = function(text) { return '- '+unquote(text) }
inlineRenderer.paragraph = function(text) { return unquote(text)+' ' }
inlineRenderer.table = function(header, body) { return unquote(header + ' ' + body) }
inlineRenderer.tablerow = function(content) { return unquote(content) }
inlineRenderer.tablecell = function(content, flags) { return unquote(content) }
inlineRenderer.strong = function(text) { return '<strong>'+unquote(text)+'</strong>' }
inlineRenderer.em = function(text) { return unquote(text) }
inlineRenderer.codespan = function(text) { return unquote(text) }
inlineRenderer.del = function(text) { return unquote(text) }
inlineRenderer.mention = function(preceding, id) { return unquote((preceding||'') + id) }
function unquote (text) {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'')
}

marked.setOptions({
  gfm: true,
  mentions: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  emoji: renderEmoji(16),
  renderer: blockRenderer
})

exports.block = function(text, mentionNames) {
  if (mentionNames && mentionNames.key && mentionNames.value) {
    // is a message, get the mentions links
    mentionNames = mlib.links(mentionNames.value.content.mentions, 'feed')
  }
  if (Array.isArray(mentionNames)) {
    // is an array of links, turn into an object map
    var n = {}
    mentionNames.forEach(function (link) {
      n[link.name] = link.link
    })
    mentionNames = n
  }

  return marked(''+(text||''), { mentionNames: mentionNames })
}

exports.inline = function(text) {
  return marked(''+(text||''), { renderer: inlineRenderer, emoji: renderEmoji(12) })
}

var emojiRegex = /(\s|>|^)?:([A-z0-9_]+):(\s|<|$)/g;
exports.emojis = function (str) {
  return str.replace(emojiRegex, function(full, $1, $2, $3) {
    return ($1||'') + renderEmoji(16)($2) + ($3||'')
  })
}

function renderEmoji (size) {
  size = size||20
  return function (emoji) {
    return emoji in emojiNamedCharacters ?
        '<img src="./img/emoji/' + encodeURI(emoji) + '.png"'
        + ' alt=":' + escape(emoji) + ':"'
        + ' title=":' + escape(emoji) + ':"'
        + ' class="emoji" align="absmiddle" height="'+size+'" width="'+size+'">'
      : ':' + emoji + ':'
    }
}

// helper to extract a good tooltip for links that were generated by blockRenderer functions
exports.getLinkTooltip = function (drop) {
  // - use data-tooltip if available
  // - fallback to data-ssb-id (TODO load interesting info)
  // - fallback to href
  return drop.target.dataset.tooltip || drop.target.dataset.ssbId || drop.target.getAttribute('href')
}