# Patchwork

![screenshot](./screenshot.png)

Patchwork is a peer-to-peer application for sharing social feeds.

Patchwork isn't a website: it runs on your computer and syncs over the Internet or WiFi.
User-tracking and advertisements are actively prevented.

![Hermies the Hermit Crab](https://avatars2.githubusercontent.com/u/10190339?v=3&s=200)

[Built with Secure Scuttlebutt](https://github.com/ssbc/docs)


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
Check out the list of active servers [here](https://github.com/ssbc/scuttlebot/wiki/Pub-Servers)


## Development & App-building : 


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
