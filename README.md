patchwork-next
===

A work-in-progress remake of [Patchwork](https://github.com/ssbc/patchwork) using [patchcore](https://github.com/ssbc/patchcore) and UX/ideas from [ferment](https://github.com/mmckegg/ferment).

The goal is to make a standalone, easy to install, "social" view into the ssb world.

![](screenshot.jpg)

## Install and run

```shell
$ git clone https://github.com/mmckegg/patchwork-next
$ cd patchwork-next
$ npm install
$ npm start
```

On linux you'll need some more dependencies for the spell-checker. On debian:

```sh
sudo apt-get install libxext-dev libxtst-dev libxkbfile-dev
```

## TODO

- [x] Main navigation buttons
- [x] Compressed feed (the algorithm :wink:)
- [x] Endless scrolling (or load more) on main feed [fake paginate, add a new section, leave the current one and remove the top most]
- [x] Display fixed banner at top of view when there are new updates [scrolls to top of page and reloads view when clicked]
- [x] Preserve scroll on back button
- [x] Treat the different "views" more like tabs. They preserve their state when switched between [scroll position, forms].
- [x] Show likes on posts in a nicer way (make it clear that you've liked something)
- [x] Hovering "+1" like values and "x other people" messages should show who
- [x] Display number of updates available on Feed buttons. Clicking reloads page.
- [x] Improve UI on profiles
  - [x] Move contacts to sidebar
  - [x] Better selection of names / avatar
- [x] Figure out when to automatically reload / or inject changes into feeds
- [x] "Join Pub" interface
- [x] Improve search UI
- [ ] Reload should remember current page
- [ ] Roll-up about messages
- [ ] Handle initial sync more gracefully
- [ ] Easy navigation sidebar
- [ ] Contacts sidebar
- [ ] Add more todos!
