patchwork-next
===

Very early **work-in-progress** attempt at remaking [Patchwork](https://github.com/ssbc/patchwork) using [patchbay](https://github.com/dominictarr/patchbay) and UX/ideas from [ferment](https://github.com/mmckegg/ferment).

The goal is to make a standalone, easy to install, "social" view into the ssb world.

## Install and run

```shell
$ git clone https://github.com/mmckegg/patchwork-next
$ cd patchwork-next
$ npm install
$ npm start
```

## TODO

- [x] Main navigation buttons
- [x] Compressed feed (the algorithm :wink:)
- [x] Endless scrolling (or load more) on main feed [fake paginate, add a new section, leave the current one and remove the top most]
- [x] Display fixed banner at top of view when there are new updates [scrolls to top of page and reloads view when clicked]
- [x] Preserve scroll on back button
- [ ] Roll-up about messages
- [ ] Join Pub interface
- [ ] Notifications drop down (show unread mentions, digs, replies)
  - [ ] to support this, we need to track subscriptions and read status
- [ ] Treat the different "views" more like tabs. They preserve their state when switched between [scroll position, forms].
- [ ] Search
- [ ] Easy navigation sidebar
- [ ] Contacts sidebar
- [ ] Show digs on posts in a nicer way (make it clear that you've dug something)
- [ ] Add more todos!
