'use strict'
var emojiNamedCharacters = require('emoji-named-characters')
var marked = require('ssb-marked')
var ssbref = require('ssb-ref')
var mlib   = require('ssb-msgs')

var renderer = new marked.Renderer();

// override to only allow external links or hashes, and correctly link to ssb objects
renderer.urltransform = function (url) {
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
      return '#/profile/'+url
    else if (ssbref.isMsgId(url))
      return '#/msg/'+url
    else if (ssbref.isBlobId(url))
      return '#/webview/'+url
  }
  else if (url.indexOf('http') !== 0) {
    return false;
  }
  return url
}

// override to make http/s links external
renderer.link = function(href, title, text) {
  href = this.urltransform(href)
  var out
  if (href !== false)
    out = '<a href="' + href + '"';
  else
    out = '<a class="bad"'
  if (title) {
    out += ' title="' + title + '"';
  }

  // make a popup if http/s
  if (href && href.indexOf('http') === 0)
    out += ' target="_blank"'

  out += '>' + text + '</a>';
  return out;
};

// override to support <video> tags (HACK)
renderer.image  = function (href, title, text) {
  href = href.replace(/^&amp;/, '&')
  if (ssbref.isLink(href)) {
    if ((''+text).indexOf('.webm') >= 0) {
      var out = '<video loop=1 muted=1 src="http://localhost:7777/' + href + '?fallback=video" alt="' + text + '"'
      if (title) {
        out += ' title="' + title + '"'
      }
      out += '></video>'
    } else {
      var out = '<a href="#/webview/' + href + '"><img src="http://localhost:7777/' + href + '?fallback=img" alt="' + text + '"'
      if (title) {
        out += ' title="' + title + '"'
      }
      out += '></a>'
    }
    return out
  }
  return text
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
  emoji: renderEmoji,
  renderer: renderer
});

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

var emojiRegex = /(\s|>|^)?:([A-z0-9_]+):(\s|<|$)/g;
exports.emojis = function (str) {
  return str.replace(emojiRegex, function(full, $1, $2, $3) {
    return ($1||'') + renderEmoji($2) + ($3||'')
  })
}

function renderEmoji (emoji) {
  return emoji in emojiNamedCharacters ?
      '<img src="./img/emoji/' + encodeURI(emoji) + '.png"'
      + ' alt=":' + escape(emoji) + ':"'
      + ' title=":' + escape(emoji) + ':"'
      + ' class="emoji" align="absmiddle" height="20" width="20">'
    : ':' + emoji + ':'
}

