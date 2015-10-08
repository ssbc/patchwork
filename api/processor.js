var mlib = require('ssb-msgs')
var u = require('./util')

module.exports = function (sbot, db, state, emit) {

  var processors = {
    post: function (msg) {
      var me = getProfile(sbot.id)
      var author = msg.value.author
      var by_me = (author === sbot.id)
      var c = msg.value.content

      if (mlib.link(c.root, 'msg')) {
        // a reply, put its *parent* in the inbox index
        state.pinc()
        u.getRootMsg(sbot, msg, function (err, rootmsg) {
          if (rootmsg && typeof rootmsg.value.content != 'string') { // dont put undecryptable msgs in the inbox
            var row = state.inbox.sortedUpsert(rootmsg.value.timestamp, rootmsg.key)
            attachIsRead(row)
            emit('index-change', { index: 'inbox' })
          }
          state.pdec()            
        })
      } else {
        // a top post, put it in the inbox index
        var row = state.inbox.sortedUpsert(msg.value.timestamp, msg.key)
        attachIsRead(row)
        emit('index-change', { index: 'inbox' })
      }
    },

    site: function (msg) {
      var site = getSite(msg.value.author)

      // additions
      mlib.links(msg.value.content.includes, 'blob').forEach(function (link) {
        if (!link.path)
          return
        site[link.path] = link
      })

      // removals
      var excludes = msg.value.content.excludes
      if (excludes) {
        ;(Array.isArray(excludes) ? excludes : [excludes]).forEach(function (item) {
          if (!item.path)
            return
          delete site[item.path]
        })
      }
    },

    contact: function (msg) {
      // update profiles
      mlib.links(msg.value.content.contact, 'feed').forEach(function (link) {
        var toself = link.link === msg.value.author
        if (toself) updateSelfContact(msg.value.author, msg)
        else        updateOtherContact(msg.value.author, link.link, msg)
      })
    },

    about: function (msg) {
      // update profiles
      mlib.links(msg.value.content.about, 'feed').forEach(function (link) {
        var toself = link.link === msg.value.author
        if (toself) updateSelfContact(msg.value.author, msg)
        else        updateOtherContact(msg.value.author, link.link, msg)
      })
    },

    vote: function (msg) {
      // update tallies
      var link = mlib.link(msg.value.content.vote, 'msg')

      if (link) {
        if (msg.value.author == sbot.id)
          updateMyVote(msg, link)
        else if (state.mymsgs.indexOf(link.link) >= 0) // vote on my msg?
          updateVoteOnMymsg(msg, link)
      }
    },

    flag: function (msg) {
      // inbox index
      var link = mlib.link(msg.value.content.flag, 'msg')
      if (sbot.id != msg.value.author && link && state.mymsgs.indexOf(link.link) >= 0) {
        var row = state.inbox.sortedInsert(msg.value.timestamp, msg.key)
        attachIsRead(row)
        row.author = msg.value.author // inbox index is filtered on read by the friends graph
        if (follows(sbot.id, msg.value.author))
          emit('index-change', { index: 'inbox' })
      }

      // user flags
      var link = mlib.link(msg.value.content.flag, 'feed')
      if (link) {
        var source = getProfile(msg.value.author)
        var target = getProfile(link.link)

        var flag = link.reason ? { key: msg.key, reason: link.reason } : false
        source.assignedTo[target.id].flagged = flag
        target.assignedBy[source.id].flagged = flag

        // track if by local user
        if (source.id === sbot.id)
          target.flagged = flag
      }
    }
  }

  function getProfile (pid) {
    if (pid.id) // already a profile?
      return pid

    var profile = state.profiles[pid]
    if (!profile) {
      state.profiles[pid] = profile = {
        id: pid,

        // current values...
        self: { name: null, image: null }, // ...set by self about self
        assignedBy: {}, // ...set by others about self
        assignedTo: {}, // ...set by self about others

        // has local user flagged?
        flagged: false
      }
    }
    return profile
  }

  function getSite (pid) {
    var site = state.sites[pid]
    if (!site)
      state.sites[pid] = site = {}
    return site
  }

  function updateSelfContact (author, msg) {
    var c = msg.value.content
    author = getProfile(author)

    // name: a non-empty string
    if (nonEmptyStr(c.name)) {
      author.self.name = makeNameSafe(c.name)
      rebuildNamesFor(author)
    }

    // image: link to image
    if ('image' in c) {
      if (mlib.link(c.image, 'blob'))
        author.self.image = mlib.link(c.image)
      else if (!c.image)
        delete author.self.image
    }
  }

  function updateOtherContact (source, target, msg) {
    var c = msg.value.content
    source = getProfile(source)
    target = getProfile(target)
    source.assignedTo[target.id] = source.assignedTo[target.id] || {}
    target.assignedBy[source.id] = target.assignedBy[source.id] || {}
    var userProf = getProfile(sbot.id)

    // name: a non-empty string
    if (nonEmptyStr(c.name)) {
      source.assignedTo[target.id].name = makeNameSafe(c.name)
      target.assignedBy[source.id].name = makeNameSafe(c.name)
      rebuildNamesFor(target)
    }

    // following: bool
    if (typeof c.following === 'boolean') {
      source.assignedTo[target.id].following = c.following
      target.assignedBy[source.id].following = c.following

      // if from the user, update names (in case un/following changes conflict status)
      if (source.id == sbot.id)
        rebuildNamesFor(target)

      // follows index
      if (target.id == sbot.id) {
        // use the follower's id as the key to this index, so we only have 1 entry per other user max
        var row = state.follows.sortedUpsert(msg.value.timestamp, msg.key)
        row.following = c.following
        attachIsRead(row, msg.key)
      }
    }

    // blocking: bool
    if (typeof c.blocking === 'boolean') {
      source.assignedTo[target.id].blocking = c.blocking
      target.assignedBy[source.id].blocking = c.blocking
    }
  }

  function rebuildNamesFor (profile) {
    profile = getProfile(profile)

    // remove oldname from id->name map
    var oldname = state.names[profile.id]
    if (oldname) {
      if (state.ids[oldname] == profile.id) {
        // remove
        delete state.ids[oldname]
      } else if (Array.isArray(state.ids[oldname])) {
        // is in a conflict, remove from conflict array
        var i = state.ids[oldname].indexOf(profile.id)
        if (i !== -1) {
          state.ids[oldname].splice(i, 1)
          if (state.ids[oldname].length === 1) {
            // conflict resolved
            delete state.actionItems[oldname]
            state.ids[oldname] = state.ids[oldname][0]
          }
        }
      }
    }

    // default to self-assigned name
    var name = profile.self.name
    if (profile.id !== sbot.id && profile.assignedBy[sbot.id] && profile.assignedBy[sbot.id].name) {
      // use name assigned by the local user, if one is given
      name = profile.assignedBy[sbot.id].name
    }
    if (!name)
      return

    // store
    state.names[profile.id] = name

    // if following, update id->name map
    if (profile.id === sbot.id || profile.assignedBy[sbot.id] && profile.assignedBy[sbot.id].following) {
      if (!state.ids[name]) { // no conflict?
        // take it
        state.ids[name] = profile.id
      } else {
        // keep track of all assigned ids
        if (Array.isArray(state.ids[name]))
          state.ids[name].push(profile.id)
        else
          state.ids[name] = [state.ids[name], profile.id]
        // conflict, this needs to be handled by the user
        state.actionItems[name] = {
          type: 'name-conflict',
          name: name,
          ids: state.ids[name]
        }
      }
    }
  }

  function updateMyVote (msg, l) {
    // myvotes index
    var row = state.myvotes.sortedUpsert(msg.value.timestamp, l.link)
    row.vote = l.value
  }

  function updateVoteOnMymsg (msg, l) {
    // votes index
    // construct a composite key which will be the same for all votes by this user on the given target
    var votekey = l.link + '::' + msg.value.author // lonnng fucking key
    var row = state.votes.sortedUpsert(msg.value.timestamp, votekey)
    row.vote = l.value
    row.votemsg = msg.key
    if (row.vote > 0) attachIsRead(row, msg.key)
    else              row.isread = true // we dont care about non-upvotes
  }

  function attachIsRead (indexRow, key) {
    key = key || indexRow.key
    state.pinc()
    db.isread.get(key, function (err, v) {
      indexRow.isread = !!v
      state.pdec()
    })
  }

  function follows (a, b) {
    var aT = getProfile(a).assignedTo[b]
    return (a != b && aT && aT.following)
  }

  // exported api

  function fn (logkey) {
    state.pinc()
    var key = logkey.value
    sbot.get(logkey.value, function (err, value) {
      var msg = { key: key, value: value }
      try {
        // encrypted? try to decrypt
        if (typeof value.content == 'string' && value.content.slice(-4) == '.box') {
          value.content = sbot.private.unbox(value.content)
          if (!value.content)
            return state.pdec()

          // put all decrypted messages in the inbox index
          var row = state.inbox.sortedInsert(msg.value.timestamp, msg.key)
          attachIsRead(row)
          row.author = msg.value.author // inbox index is filtered on read by the friends graph
          if (follows(sbot.id, msg.value.author))
            emit('index-change', { index: 'inbox' })
        }

        // collect keys of user's messages
        if (msg.value.author === sbot.id)
          state.mymsgs.push(msg.key)

        // type processing
        var process = processors[msg.value.content.type]
        if (process)
          process(msg)
      }
      catch (e) {
        // :TODO: use sbot logging plugin
        console.error('Failed to process message', e, e.stack, key, value)
      }
      state.pdec()
    })
  }

  return fn
}

function nonEmptyStr (str) {
    return (typeof str === 'string' && !!(''+str).trim())
  }

// allow A-z0-9._-, dont allow a trailing .
var badNameCharsRegex = /[^A-z0-9\._-]/g
function makeNameSafe (str) {
  str = str.replace(badNameCharsRegex, '_')
  if (str.charAt(str.length - 1) == '.')
    str = str.slice(0, -1) + '_'
  return str
}