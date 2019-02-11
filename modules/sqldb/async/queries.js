var pull = require('pull-stream')
var nest = require('depnest')
var { isFeed, isMsg } = require('ssb-ref')

exports.needs = nest({
  'sqldb.sync.sqldb': 'first'
})

exports.gives = nest({
  'sqldb.async.backlinkReferences': true,
  'sqldb.async.backlinkForks': true,
  'sqldb.async.likeCount': true,
  'sqldb.async.likesGet': true,
  'sqldb.async.doesLike': true,
  'sqldb.async.isBlocking': true,
  'sqldb.async.isFollowing': true,
  'sqldb.async.publicRoots': true,
  'sqldb.async.threadRead': true,
  'sqldb.async.get': true,
  'sqldb.async.abouts': true,
  'sqldb.async.messagesByType': true
})

exports.create = function (api) {
  return nest({
    'sqldb.async.backlinkReferences': references,
    'sqldb.async.backlinkForks': forks,
    'sqldb.async.likeCount': likeCount,
    'sqldb.async.likesGet': likesGet,
    'sqldb.async.doesLike': doesLike,
    'sqldb.async.isBlocking': isBlocking,
    'sqldb.async.isFollowing': isFollowing,
    'sqldb.async.publicRoots': publicRoots,
    'sqldb.async.threadRead': threadRead,
    'sqldb.async.messagesByType': messagesByType,
    'sqldb.async.get': get,
    'sqldb.async.abouts': abouts
  })
  function isBlocking ({ source, dest }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('contacts_raw')
      .count('contacts_raw.id as count')
      .join('authors as source', 'source.id', 'contacts_raw.author_id')
      .join('authors as dest', 'dest.id', 'contacts_raw.contact_author_id')
      .where('source.author', source)
      .where('dest.author', dest)
      .where('state', -1)
      .where('is_decrypted', 0)
      .asCallback(function (err, result) {
        if (err) return cb(err)
        cb(null, result[0].count > 0)
      })
  }

  function isFollowing ({ source, dest }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('contacts_raw')
      .count('contacts_raw.id as count')
      .join('authors as source', 'source.id', 'contacts_raw.author_id')
      .join('authors as dest', 'dest.id', 'contacts_raw.contact_author_id')
      .where('source.author', source)
      .where('dest.author', dest)
      .where('state', 1)
      .where('is_decrypted', 0)
      .asCallback(function (err, result) {
        if (err) return cb(err)
        cb(null, result[0].count > 0)
      })
  }

  function modifyDest (query, dest) {
    if (isMsg(dest)) {
      query.join('keys as dest', 'link_to_key_id', 'dest.id')
      query.where('dest.key', dest)
    } else if (isFeed(dest)) {
      query.join('authors as dest', 'link_to_author_id', 'dest.id')
      query.where('dest.author', dest)
    }
  }

  function modifyIfAuthor (query, author) {
    if (author) {
      this.where('messages.author', author)
    }
  }
  function abouts ({ dest, keys, since, reverse, author }, cb) {
    var { knex } = api.sqldb.sync.sqldb()

    var ordering = reverse ? 'desc' : 'asc'
    since = since || 0

    knex
      .select([
        'source.key as key',
        'source.author as author',
        'seq',
        'content',
        'asserted_time',
        'flume_seq'
      ])
      .from('abouts_raw')
      .modify(modifyDest, dest)
      .join('messages as source', 'link_from_key_id', 'source.key_id')
      .where('source.flume_seq', '>', since)
      .modify(modifyIfAuthor, author)
      .orderBy('source.flume_seq', ordering)
      .asCallback(function (err, results) {
        if (err) return cb(err)

        var messages = results.map(function (result) {
          return new Message(result)
        })
        cb(null, messages)
      })
  }

  function contactFollowsBlocks (contactId, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex
      .select(['dest.author as id', 'state'])
      .from('contacts_raw')
      .join('authors as source', 'source.author', 'contacts_raw.author_id')
      .join('authors as dest', 'dest.author', 'contacts_raw.contact_author_id')
      .where('is_decrypted', 0)
      .where('source.author', contactId)
      .asCallback(function (err, results) {
        if (err) return cb(err)

        results = results.map((result) => {
          var value = result.state === 1
          return {
            [result.id]: value
          }
        })

        cb(null, results)
      })
  }

  function contactFollowedBlockedBy (contactId, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex
      .select(['source.author as id', 'state'])
      .from('contacts_raw')
      .join('authors as source', 'source.author', 'contacts_raw.author_id')
      .join('authors as dest', 'dest.author', 'contacts_raw.contact_author_id')
      .where('is_decrypted', 0)
      .where('dest.author', contactId)
      .asCallback(function (err, results) {
        if (err) return cb(err)

        results = results.map((result) => {
          var value = result.state === 1
          return {
            [result.id]: value
          }
        })

        cb(null, results)
      })
  }

  function isIgnoring ({ source, dest }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('contacts_raw')
      .count('contacts_raw.id as count')
      .join('authors as source', 'source.author', 'contacts_raw.author_id')
      .join('authors as dest', 'dest.author', 'contacts_raw.contact_author_id')
      .where('source.author', source)
      .where('dest.author', dest)
      .where('is_decrypted', 1)
      .asCallback(function (err, result) {
        if (err) return cb(err)
        cb(null, result[0].count > 0)
      })
  }
  function Message (msg) {
    this.key = msg.key
    this.value = {}
    this.value.author = msg.author
    this.value.content = JSON.parse(msg.content)
    this.value.sequence = msg.seq
    this.value.timestamp = msg.asserted_time
    this.flumeSeq = msg.flume_seq
  }

  function get ({ id }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('messages')
      .where('key', id)
      .asCallback(function (err, results) {
        if (err) return cb(err)

        var messages = results.map(function (result) {
          return new Message(result)
        })
        cb(null, messages[0])
      })
  }

  // Also removes messages by authors you block.
  function messagesByType ({ type, reverse, lastSeq, limit }, cb) {
    limit = limit || Number.MAX_VALUE
    var ordering = reverse ? 'desc' : 'asc'
    var { knex } = api.sqldb.sync.sqldb()
    knex
      .select([
        'messages.key as key',
        'messages.author as author',
        'seq',
        'content',
        'asserted_time',
        'flume_seq'
      ])
      .from('messages')
      .join('contacts_raw', 'contacts_raw.contact_author_id', 'messages.author_id')
      .join('authors as source', 'source.id', 'contacts_raw.author_id')
      .where('source.is_me', 1)
      .whereNot('state', -1)
      .where('content_type', type)
      .where('flume_seq', '<', lastSeq)
      .orderBy('flume_seq', ordering)
      .limit(limit)
      .asCallback(function (err, results) {
        if (err) return cb(err)
        var messages = results.map(function (result) {
          return new Message(result)
        })
        cb(null, messages)
      })
  }

  function publicRoots ({ limit, lastSeq }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex
      .select()
      .from('messages')
      .where('flume_seq', '<', lastSeq)
      .where('is_decrypted', 0)
      .where('content_type', 'post')
      // TODO: select messages by authors in the correct follow range
      .whereNull('root')
      .orderBy('flume_seq', 'desc')
      .limit(limit)
      .asCallback(function (err, results) {
        if (err) return cb(err)

        var messages = results.map(function (result) {
          return new Message(result)
        })
        cb(null, messages)
      })
  }

  function modifyWhereTypes (query, types) {
    if (types) {
      query.whereIn('messages.content_type', types)
    }
  }
  function threadRead ({ reverse, limit, dest, types }, cb) {
    limit = limit || Number.MAX_VALUE
    var ordering = reverse ? 'desc' : 'asc'
    var { knex } = api.sqldb.sync.sqldb()

    knex
      .select([
        'messages.key as key',
        'messages.author as author',
        'seq',
        'content',
        'asserted_time',
        'flume_seq'
      ])
      .from('links')
      .join('messages', 'messages.key', 'links.link_to_key')
      .join('contacts_raw', 'contacts_raw.contact_author_id', 'messages.author_id')
      .join('authors as source', 'source.id', 'contacts_raw.author_id')
      .modify(modifyWhereTypes, types)
      .where('source.is_me', 1)
      .whereNot('state', -1)
      .where('links.link_to_key', dest)
      .orderBy('messages.flume_seq', ordering)
      .limit(limit)
      .asCallback(function (err, results) {
        if (err) return cb(err)

        var messages = results.map(function (result) {
          var msg = new Message(result)
          msg.latestReplies = []
          return msg
        })
        cb(null, messages)
      })
  }

  function publicLatest () {

  }
  function likesGet ({ dest }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex
      .select(['authors.author as id'])
      .from('votes_raw')
      .join('keys', 'keys.id', 'votes_raw.link_to_key_id')
      .join('authors', 'authors.id', 'votes_raw.link_from_author_id')
      .where('keys.key', dest)
      .asCallback(function (err, results) {
        if (err) return cb(err)
        cb(null, results.map(res => res.id))
      })
  }
  function likeCount (id, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('votes_raw')
      .count('votes_raw.id as count')
      .join('keys', 'keys.id', 'votes_raw.link_to_key_id')
      .where('keys.key', id)
      .asCallback(cb)
  }
  function doesLike ({ msgId, feedId }, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    knex('votes_raw')
      .count('votes_raw.id as count')
      .join('keys', 'keys.id', 'votes_raw.link_to_key_id')
      .join('authors', 'authors.id', 'votes_raw.link_from_author_id')
      .where('keys.key', msgId)
      .where('authors.author', feedId)
      .asCallback(function (err, result) {
        if (err) return cb(err)
        cb(null, result[0].count > 0)
      })
  }
  function forks (id, lastMessage, cb) {
    var { knex } = api.sqldb.sync.sqldb()
    lastMessage = lastMessage || { timestamp: 0 }
    var latestTimestamp = lastMessage.timestamp
    var params = {
      id,
      latestTimestamp
    }

    return knex.raw(`
      SELECT key AS id, author, received_time AS timestamp
      FROM links 
      JOIN messages ON links.link_from_key = key
      WHERE link_to_key = :id
      AND NOT content_type="about"
      AND NOT content_type="vote"
      AND NOT content_type="tag"
      AND received_time > :latestTimestamp
      AND messages.root_id = :id
    `, params).asCallback(cb)
  }

  function references (id, since, cb) {
    since = since || 0 // since will be null the first time this gets called. So set to zero.
    // var { knex, modifiers, strings } = api.sqldb.sync.sqldb()
    var db = api.sqldb.sync.sqldb()
    var { knex, modifiers, strings } = db
    var { links } = strings
    var { backLinksReferences } = modifiers

    knex
      .select([
        'links.link_from_key as id',
        'author',
        'received_time as timestamp'
      ])
      .from(links)
      .modify(backLinksReferences, id, knex)
      .where('flume_seq', '>', since)
      .asCallback(cb)

    // AND received_time > :latestTimestamp
    // AND NOT fork = :id
    //    return knex.raw(`
    //      SELECT key AS id, author, received_time AS timestamp
    //      FROM links
    //      JOIN messages ON link_from = key
    //      WHERE link_to = :id
    //      AND NOT content_type="about"
    //      AND NOT content_type="vote"
    //      AND NOT content_type="tag"
    //      AND NOT root = :id
    //     `, { latestTimestamp, id }).asCallback(cb)
  }
}
