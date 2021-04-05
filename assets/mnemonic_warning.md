**Warning: mishandling exported keys will lead to a broken feed.** If you break your feed, you will have to create a new identity and start from scratch. You will lose all your connections and possibly your previous posts, and **nobody will be able to fix this**.

At the bottom of this page you will find instructions for how to use these keys safely, but do yourself a favour and read this page before.

## Do I need this key export?

You only need to do this if you intend to move (not copy!) your Patchwork identity to a different *device*.
If you want to migrate to a different client, but stay on the *same* device, then you very likely do not need this key export.

## What can I use the exported keys for?

This page allows you to export your `secret`, i.e. your ssb feed's private key as a series of common words. Other clients, first and foremost [manyverse](https://manyver.se), can *import* the secret in this form. This allows you to discontinue Patchwork (which is unmaintained) and instead interact with the ssb network through the new client. We'll be talking about manyverse pretty much exclusively here because it is *currently* the only client that can import this export. But for other clients, the procedure should be very similar.

## What can I *not* do with the exported keys?

You can *not* use the keys to use the same identity on multiple devices.
To be precise: if you try this you will regret it very quickly, since the most likely outcome is that you will eventually "fork" your feed.
Keeping your feed intact is your own responability. Neither the Patchwork developers, nor the manyverse developers, nor anyone else will be able to help you if you fork your feed.

## What does it mean to "fork" a feed?

Scuttlebutt relies, among other things, on one basic property of ssb feeds: that they are linear.
In practice, that means that every message contains a reference to the preceding one, so that they form one long chain all the way back to the first message of the feed.
And for each message, ssb also computes a `hash`, i.e. a strong check-sum, *from* the message.
Let's pretend that the `hash` of a message is computed by selecting the *one* emoji that best represents it.
Here are some examples from a feed called `@Carol`:

sequence  | hash         | previous     | type | content
:-|:-|:-|:-|:-
98        | :bird:       |              | post | Look at this cute bird!
99        | :cake:       |  :bird:      | post | Happy birthday Bob!
100       | :thumbsup:   |  :cake:      | like | \<Carol likes Alice's post\>

Note how for every message the `sequence` number increases by exactly one, and the `previous` corresponds to the `hash` of the preceding message.
This makes replication very easy.

### Example: How ssb peers replicate data

Let's say that the computer of Alice connects to the computer of Bob to exchange messages.
Alice asks for updates about Carol. Here is how they do it, in very simplified terms:

```
Alice: Hi Bob, do you have messages from Carol?

Bob:   Yes, the latest message I have is number 100.

Alice: The latest message I have is number 99.
       Please send me the missing message.

Bob:   Here is the missing message.

Alice: Ah yes, this is number 100, signed by Carol alright
       The "previous" 🍰 matches the "hash" 🍰 from number 99.
       Ohh, the message says that Carol loves my #foffee post!
       Excellent!
```

As you can see, this is dead simple.
Once Alice receives message number `100` she checks that the `previous` :cake: of this message matches the `hash` :cake: she knows from message `99`.
If they match, all is good and she considers message `100` as valid. She saves it to her local database with the `hash` :thumbsup:.

### How does a fork happen?

This is the sad story of how Carol forked her feed.
Carol had been using Patchwork for a while already. As the development of Patchwork had seized she decide to give manyverse a go.
But Carol skipped reading this explanation. She tried to get to her key export as fast as possible without understanding what she was doing.
With her key export in hand she quit Patchwork and immediately set up manyverse on her phone.
After the import she was greeted with an empty screen. But she just went ahead, got an invite to an ssb room, and connected to some random stranger. The import worked fine. After a while she could see all her posts, and in celebration of this fact she posted a :cat2: picture from this morning.

And just like that, Carol had forked her feed. Carol didn't know it yet, but from here on out, people would barely be reading her messages.
Soon after, Carol stopped using ssb, feeling left alone by her friends who seemed to have abandoned her.

**But what had happened with Carol's feed that was so bad?**
When Carol connected to the ssb room, she synced her old messages from the first peer she connected with.
This stranger, called Dan, however, had not seen her last message :thumbsup: number `100` yet.
What Carol didn't realize was that the posts she saw stopped at number `99`. Dan had not transmitted the :thumbsup: message `100` because he hadn't seen it yet.
That last message number :thumbsup: `100` that she had sent out, the one that made Alice so happy, was not actually a *post*, it was a *reaction* and Carol had missed the fact that this reaction was not being shown in the manyverse interface; an easy mistake to make, right?
So now Carol had made a new message :cat2:, numbered it `100` and sent it off to Dan.
Dan in turn had forwarded the :cat2: messsage `100` to a few of his own peers.
All the while, Alice and Bob had been broadcasting the :tada: message `100`.

Later that evening, Alice and Dan's computers connected:

```
Alice: Hey Dan, do you have updates from Alice?

Dan:   Yes, the last number I have is 100.

Alice: The latest message I have is number 100, too.
       Okay thank you then, nothing to do here.
```

And none of them realized what had just happened.

The next day, Alice saw the most beautiful sunrise :sunrise:. She snapped a picture and sent it off via manyverse with the number `101`.

sequence  | hash         | previous     | type | content
:-|:-|:-|:-|:-
101       | :sunrise:   |  :cat2:      | post | Good morning sunshine!

Her phone connected to Dan and gossiped away happily. Dan liked the photo!
But Alice and Bob never saw it. Here is how it went down when Alice's computer talked to Dan's later that day:

```
Alice: Hey Dan, do you have updates from Alice?

Dan:   Yes, the last number I have is 101.

Alice: The latest message I have is number 100.
       Please send me the missing message.

Dan:   Here is the missing message.

Alice: Ah, this is number 101, signed by Carol alright.
       But the "previous" 🐈 does not match the
       "hash" 🍰 from number 100! PANIC!?!
       There is something seriously wrong here! :(
       I can't save this like that.
```

From this point on, only some of Carol's friends ever got to see her posts: those that happened to see the :cat2: message before the :thumbsup: one. Some of her friends were using ssb clients with stricter enforcement; those clients marked her entire feed as not trustworthy when they saw the fork.
And she never knew.

Don't be like Carol. Be careful and don't fork your feed.

## How do I *safely* migrate to a different client?

Now that you're appropriately scared to fork your feed, let's look at how to *still* migrate your identity to manyverse.
But first, to re-iterate:
**You only *need* to do this if you intend to move to a mobile device, and you *must* stop using the identity in Patchwork.**

The following instructions should keep the risk of forking at a minimum. They also explain *why* the steps are necessary, that should reduce the risk of misunderstandings.
However, if you do end up with a forked feed, it may be hard to *realize* it, and it will probably be *impossible* to fix.
The only way to go forward in that case is a new identity.

So beware, here be dragons!

What you will need:

* PC/Mac running Patchwork
  This is the device you're migrating *from* and that you're probably reading this on right now. We'll just call it "PC" from now on.
* Phone/Tablet with Manyverse installed
  This is the device you're migrating *to*. We use manyverse as an example since it is the only client supporting key import at the time of writing. We'll just call it "phone" from here on.
* Wifi.
  You will be transferring data directly between the two devices, so they need to be able to see each other on some local network, and Wifi is the obvious choice for that.
* A piece of paper and a pen.
  To write your key export down. If you're feeling paranoid, some matches and an ashtray will be helpful to get rid of it later. :slightly_smiling_face:

And now, without further ado:

1. Read *and understand* this page in its entirety. Make a copy of this checklist; screenshot, copy/paste, whatever suits you.
2. Export your keys at the bottom of the page. Write it on a piece of paper. Double and triple-check it.
3. Make one last post on Patchwork.
   This serves two purposes: First, it signals to your peers that trouble may be ahead if things go wrong. Second, it makes it clearly *visible* what your last feed activity was. So make it distinctive. Later on, you'll be checking in manyverse whether you can see this post, to know when it's safe to post from manyverse for the first time.
4. Stop *all* activity in Patchwork.
   It is important that the post you just created stays the very *last* one of your feed. Pretty much any activity in Patchwork will break that assumption: liking/unliking posts, joining/unjoining events, subscribing/unsubscribing to/from channels, private messages, public posts, profile updates, follows/unfollows; all of these generate messages that would add to your feed. So don't do *any* of those.
   Bonus: verify that your latest post has showed up on some *other* machine. You can ask a friend (by phone or mail, but not by ssb of course, since that would produce new messages!) to verify that they can see your post. That way you know that the post made it to the network. If you enabled `publicWebHosting` before, then your post should show up on public ssb-viewer instances. If you see someone liking or replying to your last post, that's also a good way to know someone has received it.
5. Quit Patchwork.
6. Move your `secret` out of the way.
   You don't want to delete it *just yet*, but we need to make Patchwork believe it is someone else, to avoid any identity confusion when the key-imported manyverse connects to the PC and talks to "itself".
   On the PC, your private key lives in a file called `secret` inside the `.ssb` folder. Here's where you typically find this file:
   * Linux: `/home/<username>/.ssb/` where you replace `<username>` with your own. Note that `.ssb` is considered hidden since it starts with a `"."` so you may have to "show hidden files" or such in your file manager. If you installed patchwork with `sudo snap install ssb-patchwork` then you're looking for `~/snap/ssb-patchwork/3/.ssb/` where you might need to replace `3` with a different number.
   * MacOS: like on Linux, look for `~/.ssb/`
   * Windows: `%userprofile%\.ssb` which typically points to `C:\Users\<username>\.ssb`
   Once you find the file, just rename it to `secret_bak` or such. Patchwork will generate a new, random `secret` when it starts the next time.
7. Start Patchwork
   It will launch with a popup asking you to create your basic profile, because the feed it just randomly created has never posted anything. You can go ahead and give yourself a name, or not, as you please.
8. Put your phone into airplane mode.
   We don't want it reaching out to other peers just yet.
9. Launch manyverse and import your key.
   **Do not post anything, like anything, or update your profile!**
   From this moment on, your phone is the sole holder of this identity, but for now it doesn't know its own history.
   Remember Carol? You don't want to produce *any* messages on the phone until you're sure that it is fully synced.
10. Go to the manyverse settings and reduce the hop count to 1.
    This is optional and simply aims to ease the load of the initial sync. Keeping this sync short will reduce the total amount of stress you will experience during the process. You can reset the hops count to any other value once you're finished.
11. Disable airplane mode.
    Check the connections tab in manyverse, and the connections tab in Patchwork. The devices should now be able to see each other.
    **Do not follow the patchwork identity!**
    Again: following someone will create a message and fork your feed. But inside manyverse, you can "Connect" to the Patchwork peer, which means just that: connecting to them to exchange messages, without necessarily following them. In Patchwork it is now safe to *follow* the manyverse identity, since Patchwork now runs a different identity.
    Either of the two actions, connecting from manyverse or following from Patchwork, should trigger the desired initial sync.
12. Wait for the initial sync to finish.
    This might take a while, and manyverse should update you on the status with a progress indicator.
    Remember that post you made all the way back in step 3? Once you see *that* exact post at the top of your profile in manyverse, you're good.
    At this point there may still be a lot of data left to index from *other* feeds, especially if you reset the hop count to 2 or more. But your own feed is now back up to date and manyverse is now safe to use.
13. Clean up: on the PC, remove the `secret_bak` file from step 6.
    You don't want your secret lying around on two machines. If you want a backup of your key, keep the piece of paper with the key export in a safe place.
14. Update your friends on ssb about your adventure. Thank the developers of manyverse for the amazing work (quality *and* quantity) that they've been pouring into it.

### Troubleshooting

As stated repeatedly before, this is a risky operation and we (anyone) can't really give support for it.
If the above goes wrong, honestly the best way to proceed is to just create a new manyverse identity. Depending on how & when things go wrong, you might be forked and it might be really hard to tell. Just create a new identity, follow the same feeds you followed before, and also follow your own old feed.
Don't be sad; forking your feed is also a bit of a rite of passage.
We did warn you, didn't we? :slightly_smiling_face: