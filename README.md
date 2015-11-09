# Patchwork

![screenshot](./screenshot.png)

Patchwork is a decentralized sharing app.
It was built for friends of the SSB project, to test basic functions.
We use it as a test-bed for features, and for our own daily messaging.

Because SSB is a research project, **you'll need to contact an SSB team member (in #scuttlebutt on Freenode) to get onto the network!**
That's our informal barrier to entry right now, since we're not prepared for lots of users yet.

[![Hermies the Hermit Crab](https://avatars2.githubusercontent.com/u/10190339?v=3&s=200)](https://github.com/ssbc/scuttlebot)

Patchwork embeds [Scuttlebot](https://github.com/ssbc/scuttlebot), so if you're running Patchwork, you don't need to run another scuttlebot server.


## Running Patchwork

Current install steps are:

```
# ubuntu
apt-get install automake libtool
# osx
brew install automake libtool
```

Also, you'll need to use iojs@2.
The easiest way to get this is [nvm](https://github.com/creationix/nvm).

```
nvm install iojs-v2.5.0
```

Then, install the software:

```
git clone https://github.com/ssbc/patchwork.git
cd patchwork
npm install
npm start
```

And then join a pub server.


## Development & building : 

**[Project Structure Doc](./docs/PROJECT-STRUCTURE.md)**.
**[Testing Check-list](./docs/TESTING.md)**, run through this before publishing any new versions.

**Dependencies**

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
