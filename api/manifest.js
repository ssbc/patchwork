module.exports = {
  createEventStream: 'source',

  getIndexCounts: 'async',
  createInboxStream: 'source',
  createBookmarkStream: 'source',
  createVoteStream: 'source',
  createMyvoteStream: 'source',
  createFollowStream: 'source',

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