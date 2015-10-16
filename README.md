# Patchwork

![screenshot](./screenshot.png)

Patchwork is a decentralized sharing app.
It was built for friends of the SSB project, to test basic functions.
We use it as a test-bed for features, and for our own daily messaging.

Because SSB is a research project, **you'll need to contact an SSB team member (in #scuttlebutt on Freenode) to get onto the network!**
That's our informal barrier to entry right now, since we're not prepared for lots of users yet.

[![Hermies the Hermit Crab](https://avatars2.githubusercontent.com/u/10190339?v=3&s=200)](https://github.com/ssbc/scuttlebot)

Patchwork embeds [Scuttlebot](https://github.com/ssbc/scuttlebot), so if you're running Patchwork, you don't need to run another scuttlebot server.


## Install

``` bash
npm install patchwork -g
```

## Run

``` bash
patchwork
```

If it's your first time running patchwork,
follow the on screen instructions to start a new identity
and join a pub server.


## Development & App-building :

to build for windows:

```
# Linux dependencies
add-apt-repository ppa:ubuntu-wine/ppa -y
apt-get update
apt-get install nsis wine

# OSX dependencies
brew install makensis wine
```

```
npm install -d
npm run build
npm run pack
```

---

Relevant docs:

 - https://github.com/maxogden/electron-packager
 - https://github.com/loopline-systems/electron-builder
 - https://github.com/atom/electron/tree/master/docs
