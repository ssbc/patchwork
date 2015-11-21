# Building


## CSS

Build `ui/less` into `ui/css`.

```
npm run build:ui
```


## Electron Package

Produce packages for Windows, OSX, and Linux.
Windows requires special dependencies:

```
# Windows dependencies in Linux
$ add-apt-repository ppa:ubuntu-wine/ppa -y
$ apt-get update
$ apt-get install nsis wine

# Windows dependencies in OSX
$ brew install makensis wine
```

To build the package:

```
npm install -d
npm run build
npm run pack
```