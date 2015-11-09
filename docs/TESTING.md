# Test Checklist

Follow this procedure before every version bump.

## Dev Environment

to start

```
ssb_appname=test npm start
```

to reset

```
rm -Rf ~/.test
```

## Checklist

This checklist should be run, in full, in the order given.

### Setup modal

  - Test bad inputs
   1. no name.
   2. name with spaces, too many periods, unusual characters.
   3. non-PNG and non-JPG pictures.
  - Test with good name and picture:
   1. Create profile with name and picture.
   2. Ensure that you are shown the welcome help, and exit it.
   3. Open profile view, upload another picture.
  - Test with good name and no picture:
   1. Close patchwork, reset, reopen.
   2. Create profile with name, no picture.
   3. Open profile view, upload picture.

### Public message and reply

  - Test bad inputs
   1. no text
  - Test good input:
   1. Open newsfeed.
   2. Open composer, post a test message.
   3. Check the message appeared automatically in newsfeed (no refreshing).
   4. Open the message.
   5. Reply to the message.
   6. Check that the reply appeared automatically in thread (no refreshing).
   7. Check the newsfeed to ensure reply count automatically updated (no refreshing).

### Private message and reply

  - Test bad inputs
   1. no text.
  - Test good input:
   1. Open inbox.
   2. Open composer, send a test message to self.
   3. Check the message appeared automatically in inbox (no refreshing).
   4. Open the message.
   5. Reply to the message.
   6. Check that the reply appeared automatically in thread (no refreshing).
   7. Check the inbox to ensure reply count automatically updated (no refreshing).

### Public post upvotes

  - Dig from newsfeed.
   1. Open newsfeed.
   2. Dig a message.
   3. Check that button state updated, and name was added to message as someone who dug it.
   4. Open message.
   5. Check that button state and dug-list is correct.
  - Undig from newsfeed.
   1. Undig the previous message
   2. Check that button state updated, and name was removed from message's dug-list.
   3. Open message.
   4. Check that button state and dug-list is correct.
  - Dig from thread.
   1. Open the message.
   2. Dig it.
   3. Check that button state updated, and name was added to message as someone who dug it.
   4. Open newsfeed.
   5. Check that button state and dug-list is correct.
  - Undig from thread.
   1. Open the message.
   2. Undig it.
   3. Check that button state updated, and name was removed from message's dug-list.
   4. Open newsfeed.
   5. Check that button state and dug-list is correct.

### Private post upvotes

  - Dig from thread.
   1. Open the inbox.
   2. Open an encrypted message.
   3. Dig it.
   4. Check that button state updated, and name was added to message as someone who dug it.
  - Undig from thread.
   1. Open the same message.
   2. Undig it.
   3. Check that button state updated, and name was removed from message's dug-list.

### Public post downvotes

  - Flag from newsfeed.
   1. Open newsfeed.
   2. Flag a message.
   3. Check that the message is now muted, the button state updated, and name was added to message as someone who flagged it.
   4. Open message.
   5. Check that button state and flagged-list is correct.
  - Unflag from newsfeed.
   1. Unflag the previous message
   2. Check that the message is now unmuted, the button state updated, and name was removed from message's flagged-list.
   3. Open message.
   4. Check that button state and flagged-list is correct.
  - Flag from thread.
   1. Open the message.
   2. Flag it.
   3. Check that button state updated, and name was added to message as someone who flagged it.
   4. Open newsfeed.
   5. Check that the message is now muted, the button state and flagged-list is correct.
  - Unflag from thread.
   1. Open the message.
   2. Unflag it.
   3. Check that button state updated, and name was removed from message's flagged-list.
   4. Open newsfeed.
   5. Check that the message is now unmuted, the button state and flagged-list is correct.

### Private post downvotes

  - Flag from thread.
   1. Open the inbox.
   2. Open an encrypted message.
   3. Flag it.
   4. Check that button state updated, and name was added to message as someone who flagged it.
  - Unflag from thread.
   1. Open the same message.
   2. Unflag it.
   3. Check that button state updated, and name was removed from message's flagged-list.

### Following

  - Pre-test setup:
   1. Close patchwork, delete the `~/.test/secret`, start patchwork
   2. Setup the new test user
  - Follow a user
   1. Open the old test-user in the contacts view.
   2. Click the follow button.
   3. Ensure the follow-state has changed, and that you are now listed in the followers of that user.
   4. Open self profile.
   5. Ensure the old test-user is now listed in your following section.

### Unfollowing

  - Unfollow a user
   1. Open the old test-user in the contacts view.
   2. Click the unfollow button.
   3. Ensure the follow-state has changed, and that you are now unlisted from the followers of that user.
   4. Open self profile.
   5. Ensure the old test-user is now unlisted from your following section.

### Flagging

  - Flag a user
   1. Open the old test-user in the contacts view.
   2. Click the flag button, and choose any reason.
   3. Ensure the flag-state has changed, and that you are now listed in the flaggers of that user, with the chosen reason.

### Unflagging

  - Unflag a user
   1. Open the old test-user in the contacts view.
   2. Click the unflag button.
   3. Ensure the flag-state has changed, and that you are now unlisted from the flaggers of that user.

### User search
 
  - Search for a user.
   1. Open the contacts view
   2. Enter the old test-user's nickname in the search input
   3. Ensure the old test-user appears
   4. Do the same for your current test-user's nickname

### Join a pub

  - Bad inputs
   1. Click the Join a Pub btn in the left nav.
   2. Use each of the following bad codes, ensuring a human-readable error message on each failure:
    - foo
    - 176.58.117.63:8008:@J+0DGLgRn8H5tVLCcRUfN7NfUcTGEZKqML3krEOJjDY=.ed25519
    - 176.58.117.63:8008:@J+0DGLgRn8H5tVLCcRUfN7NfUcTGEZKqML3krEOJjDY=.ed25519~ehmZ6O8yohSGwISC8iMJjPTlp/Q0EODWi+EYNA+w=
    - 176.58.117.63:8008:@J+0DGLgRn8H5tVLCcRUcN7NfUcTGEZKqML3krEOJjDY=.ed25519~ehmZ6O8yoh6rMSGwISC8iMJjPTlp/Q0EODWi+EYNA+w=
  - Using an invite
   1. Click the Join a Pub btn in the left nav.
   2. Enter the test-pub's invite.
   3. Ensure you are taken to the newsfeed and receive new posts.
   4. Ensure sync status indicators show you are globally-connected.