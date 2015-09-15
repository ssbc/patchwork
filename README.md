# Patchwork

**Patchwork is in active development. <a href="http://ssbc.github.io/">Sign up for our mailing list</a>, and we'll notify you when it's ready to use.**

Patchwork is a peer-to-peer network for sharing social feeds and open-source software. It gives you freedom to meet and collaborate online without surrendering ownership of your data.

Patchwork isn't a website: it runs on your computer and syncs over the Internet or WiFi. User-tracking and advertisements are actively prevented, and user applications are fully supported.

<a href="http://ssbc.github.io/">Learn more</a>


## Running Patchwork

**Dependencies:**

```
# Linux dependencies
apt-get install automake

# OSX dependencies
brew install automake
```

```
npm install
npm start
```


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
