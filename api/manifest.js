module.exports = {
  createEventStream: 'source',

  getIndexCounts: 'async',
  createInboxStream: 'source',
  createBookmarkStream: 'source',
  createPrivatePostStream: 'source',
  createPublicPostStream: 'source',
  createChannelStream: 'source',

  markRead: 'async',
  markUnread: 'async',
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

  addFileToBlobs: 'async',
  saveBlobToFile: 'async',

  useLookupCode: 'source',

  getMyProfile: 'async',
  getProfile: 'async',
  getAllProfiles: 'async',

  getNamesById: 'async',
  getName: 'async',
  getIdsByName: 'async',
  getActionItems: 'async'
}