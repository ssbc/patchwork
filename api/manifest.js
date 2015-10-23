module.exports = {
  createEventStream: 'source',

  getIndexCounts: 'async',
  createNewsfeedStream: 'source',
  createInboxStream: 'source',
  createBookmarkStream: 'source',
  createNotificationsStream: 'source',

  markRead: 'async',
  markUnread: 'async',
  toggleRead: 'async',
  isRead: 'async',

  bookmark: 'async',
  unbookmark: 'async',
  toggleBookmark: 'async',
  isBookmarked: 'async',

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