var mlib = require('ssb-msgs')
var ssbref = require('ssb-ref')
var u = require('./util')

module.exports = function (sbot, db, state, emit) {

  // conversion helpers
  function toBool (v) {
    if (typeof v == 'undefined')
      return null
    return !!v
  }
  function toString (v) {
    if (typeof v == 'string')
      return v
    return null
  }
  function toLinkKey (v) {
    return (v) ? v.link : null
  }
  function toVoteValue (v) {
    if (v ==  0) return 0
    if (v > 0) return 1
    return -1
  }

  function sqlRun (query, values) {
    state.pinc()
    state.sqldb.run(query, values, sqlAndDone)
  }
  function sqlAndDone (err) {
    state.pdec()
    if (err)
      console.log(err)
  }
  function processSql (msg) {

    // TODO use prepared statements
    // TODO serial/parallel? it seems pretty sure that the vote and profile tables need to be serial ...
    // ... because the data is computed by taking the last value published by that author ...
    // ... but serial mode is REALLY slow !!

    // common tables
    // messages
    sqlRun(
      'INSERT INTO msgs (key, author, recv_time, send_time, is_encrypted, content_type) VALUES (?, ?, ?, ?, ?, ?);',
      [msg.key, msg.value.author, msg.received, msg.value.timestamp, +msg.isEncrypted, toString(msg.value.content.type)]
    )
    // links
    mlib.indexLinks(msg, function (obj, rel) {
      sqlRun(
        'INSERT INTO msg_links (rel, src_key, src_author, dst_key, dst_type) VALUES (?, ?, ?, ?, ?);',
        [rel, msg.key, msg.value.author, obj.link, ssbref.type(obj.link)]
      )
    })

    // patchwork message-type tables
    var c = msg.value.content
    // posts
    if (c.type === 'post') {
      var root = mlib.link(c.root, 'msg')
      var branch = mlib.link(c.branch, 'msg')
      sqlRun(
        'INSERT INTO post_msgs (msg_key, channel, text, root_msg_key, branch_msg_key) VALUES (?, ?, ?, ?, ?);',
        [msg.key, toString(c.channel), toString(c.text), toLinkKey(root), toLinkKey(branch)]
      )
    }
    // votes
    // TODO serial/parallel?
    if (c.type === 'vote') {
      var vote = mlib.link(c.vote)
      if (vote && (typeof vote.value === 'number')) {
        var dst_key = vote.link
        var value = vote.value
        sqlRun(
          'INSERT OR REPLACE INTO votes (key, dst_key, dst_type, author, vote, reason) VALUES (?, ?, ?, ?, ?, ?);',
          [msg.value.author+dst_key, dst_key, ssbref.type(dst_key), msg.value.author, toVoteValue(vote.value), toString(vote.reason)]
        )
      }
    }
    // profiles
    if (c.type == 'about' || c.type == 'contact') {
      // upsert pattern from https://stackoverflow.com/questions/418898/sqlite-upsert-not-insert-or-replace/7353236#7353236
      // execute these commands serially, as the update must come after the insert
      // state.sqldb.serialize(function () { TODO seriali/parallel?
      ;(function () {
        var key
        var dst_key
        var changeKeys = [], changeValues = [] // changes to affect

        // fetch link, abort if missing
        dst_key = toLinkKey(mlib.link(c[c.type]))
        if (!dst_key)
          return
        key = msg.value.author+dst_key

        // collect changes
        if (c.type == 'about') {
          var name = toString(c.name)
          var image_key = toLinkKey(mlib.link(c.image, 'blob'))
          if (name) {
            changeKeys.push('name')
            changeValues.push(name)
          }
          if (image_key) {
            changeKeys.push('image_key')
            changeValues.push(image_key)
          }
        }
        if (c.type == 'contact') {
          var following = toBool(c.following)
          var blocking = toBool(c.blocking)
          if (following !== null) {
            changeKeys.push('is_author_following')
            changeValues.push(following)
          }
          if (blocking !== null) {
            changeKeys.push('is_author_blocking')
            changeValues.push(blocking)
          }
        }

        // abort if there are no changes we're interested in
        if (changeKeys.length === 0)
          return

        var changeKeysList = changeKeys.join(', ')
        var changeKeysPlaceholders = changeKeys.map(function (k) { return '?' }).join(', ')
        var changeKeysSets = changeKeys.map(function (k) { return k+'=?' }).join(', ')
        sqlRun(
          'INSERT OR IGNORE INTO profiles (key, dst_key, dst_type, author, '+changeKeysList+') VALUES (?, ?, ?, ?, '+changeKeysPlaceholders+');',
          [key, dst_key, ssbref.type(dst_key), msg.value.author].concat(changeValues)
        )
        sqlRun(
          'UPDATE profiles SET '+changeKeysSets+' WHERE changes()=0 AND key=?;',
          changeValues.concat([key])
        )
      })()
    }
  }

  var processors = {
    post: function (msg) {
      var me = getProfile(sbot.id)
      var author = msg.value.author
      var by_me = (author === sbot.id)
      var c = msg.value.content
      var root = mlib.link(c.root, 'msg')
      var recps = mlib.links(c.recps)
      var mentions = mlib.links(c.mentions)

      // newsfeed index: add public posts / update for replies
      if (!root && recps.length === 0) {
        state.newsfeed.sortedUpsert(ts(msg), msg.key)
        emit('index-change', { index: 'newsfeed' })
      }
      else if (root) {
        var newsfeedRow = state.newsfeed.find(root.link)
        if (newsfeedRow) {
          state.newsfeed.sortedUpsert(ts(msg), root.link)
          emit('index-change', { index: 'newsfeed' })
        }
      }

      if (c.channel && typeof c.channel === 'string') {
        // channels index: add root posts / update for replies
        var indexName = 'channel-'+c.channel
        var index = state[indexName] = (state[indexName] || u.index(indexName))
        if (root) {
          // reply
          var channelRow = index.find(root.link)
          if (channelRow) {
            index.sortedUpsert(msg.value.timestamp, root.link)
            emit('index-change', { index: indexName })            
          }
        } else {
          // new post
          index.sortedUpsert(msg.value.timestamp, msg.key)
          emit('index-change', { index: indexName })
        }
      }

      // bookmarks index: update for replies
      var bookmarkRow
      if (root) {
        bookmarkRow = state.bookmarks.find(root.link)
        if (bookmarkRow) {
          state.bookmarks.sortedUpsert(ts(msg), root.link)
          emit('index-change', { index: 'bookmarks' })
          attachChildIsRead(bookmarkRow, msg.key)
        }
      }

      // inbox index: update for replies
      var inboxRow
      if (root) {
        inboxRow = state.inbox.find(root.link)
        if (inboxRow) {
          state.inbox.sortedUpsert(ts(msg), root.link)
          emit('index-change', { index: 'inbox' })
          attachChildIsRead(inboxRow, msg.key)
        }
      }
      // inbox index: add msgs addressed to the user
      else if (!inboxRow) { // dont bother if already updated inbox for this msg
        if (findLink(recps, sbot.id)) {
          inboxRow = state.inbox.sortedUpsert(ts(msg), root ? root.link : msg.key)
          emit('index-change', { index: 'inbox' })
          attachChildIsRead(inboxRow, msg.key)          
        }
      }

      // notifications index: add msgs that mention the user
      if (findLink(mentions, sbot.id)) {
        var notificationsRow = state.notifications.sortedUpsert(ts(msg), msg.key)
        emit('index-change', { index: 'notifications' })
        attachIsRead(notificationsRow)   
      }
    },

    contact: function (msg) {      
      mlib.links(msg.value.content.contact, 'feed').forEach(function (link) {
        // update profiles
        var toself = link.link === msg.value.author
        if (toself) updateSelfContact(msg.value.author, msg)
        else        updateOtherContact(msg.value.author, link.link, msg)

        // notifications indexes: add follows or blocks
        if (link.link === sbot.id && ('following' in msg.value.content || 'blocking' in msg.value.content)) {
          state.notifications.sortedUpsert(ts(msg), msg.key)
          emit('index-change', { index: 'notifications' })
        }
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
      // notifications index: add votes on your messages
      var msgLink = mlib.link(msg.value.content.vote, 'msg')
      if (msgLink && state.mymsgs.indexOf(msgLink.link) >= 0) {
        state.notifications.sortedUpsert(ts(msg), msg.key)
        emit('index-change', { index: 'notifications' })
      }

      // user flags
      var userLink = mlib.link(msg.value.content.vote, 'feed')
      if (userLink) {
        var source = getProfile(msg.value.author)
        var target = getProfile(userLink.link)
        source.assignedTo[target.id] = source.assignedTo[target.id] || {}
        target.assignedBy[source.id] = target.assignedBy[source.id] || {}

        if (userLink.value < 0) {
          // a flag
          source.assignedTo[target.id].flagged = userLink
          target.assignedBy[source.id].flagged = userLink
          if (source.id === sbot.id)
            target.flagged = userLink
        } else {
          // not a flag
          source.assignedTo[target.id].flagged = false
          target.assignedBy[source.id].flagged = false
          if (source.id === sbot.id)
            target.flagged = false
        }
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

  function attachIsRead (indexRow, key) {
    key = key || indexRow.key
    state.pinc()
    db.isread.get(key, function (err, v) {
      indexRow.isread = !!v
      state.pdec()
    })
  }

  // look up the child and root isread state, combine them with the current row's isread state
  function attachChildIsRead (indexRow, childKey, cb) {
    state.pinc()
    var rootIsRead, childIsRead

    // get child isread
    db.isread.get(childKey, function (err, v) {
      childIsRead = !!v
      next()
    })

    // lookup the root isread from DB if not already on the row
    if (typeof indexRow.isread == 'boolean') {
      rootIsRead = indexRow.isread
    } else {
      db.isread.get(indexRow.key, function (err, v) {
        rootIsRead = !!v
        next()
      })      
    }

    function next () {
      // wait for both
      if (typeof rootIsRead != 'boolean' || typeof childIsRead != 'boolean')
        return

      // combine child and root isread state
      indexRow.isread = rootIsRead && childIsRead
      
      cb && cb(null, indexRow.isread)
      state.pdec() // call this last, after all async work is done
    }
  }

  function follows (a, b) {
    var aT = getProfile(a).assignedTo[b]
    return (a != b && aT && aT.following)
  }

  function findLink (links, id) {
    for (var i=0; i < (links ? links.length : 0); i++) {
      if (links[i].link === id)
        return links[i]
    }
  }

  // helper to get the most reliable timestamp for a message
  // - stops somebody from boosting their ranking (accidentally, maliciously) with a future TS
  // - applies only when ordering by most-recent
  function ts (msg) {
    return Math.min(msg.received, msg.value.timestamp)
  }

  // exported api

  function fn (logkey) {
    state.pinc()
    var key = logkey.value
    sbot.get(logkey.value, function (err, value) {
      var msg = { key: key, value: value, received: logkey.key, isEncrypted: false }
      try {
        // encrypted? try to decrypt
        if (typeof value.content == 'string' && value.content.slice(-4) == '.box') {
          msg.isEncrypted = true
          value.content = sbot.private.unbox(value.content)
          if (!value.content)
            return state.pdec()
        }

        processSql(msg)

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