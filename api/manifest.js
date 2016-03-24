module.exports = {
  createEventStream: 'source',

  getIndexCounts: 'async',
  createInboxStream: 'source',
  createBookmarkStream: 'source',
  createMentionStream: 'source',
  createFollowStream: 'source',
  createDigStream: 'source',
  createPrivatePostStream: 'source',
  createPublicPostStream: 'source',
  createChannelStream: 'source',
  createSearchStream: 'source',

  markRead: 'async',
  markUnread: 'async',
  markAllRead: 'async',
  toggleRead: 'async',
  isRead: 'async',

  bookmark: 'async',
  unbookmark: 'async',
  toggleBookmark: 'async',
  isBookmarked: 'async',

  getChannels: 'async',
  pinChannel: 'async',
  unpinChannel: 'async',
  toggleChannelPinned: 'async',
  watchChannel: 'async',
  unwatchChannel: 'async',
  toggleChannelWatched: 'async',

  addFileToBlobs: 'async',
  saveBlobToFile: 'async',

  useLookupCode: 'source',

  getMyProfile: 'async',
  getProfile: 'async',
  getAllProfiles: 'async',

  getNamesById: 'async',
  getIdsByName: 'async',
  getName: 'async',
  getActionItems: 'async'
}