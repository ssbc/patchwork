# Installation

The readme contains some information on the simplest installation methods, but
you can also install Patchwork by fetching from Git and building from source.


## Dependencies

- Git
- Node.js (>= 6)
- npm or Yarn

### Debian / Ubuntu

```shell
apt-get install \
  automake \
  g++ \
  libgconf-2-4 \
  libtool \
  libxext-dev \
  libxkbfile-dev \
  libxtst-dev \
  m4
```

### CentOS / Fedora

```shell
dnf install \
  libXext-devel \
  libXtst-devel \
  libxkbfile-devel \
  gcc-c++ \
  m4 \
  automake \
  libtool
```

### macOS

```shell
brew install libtool automake
```

## Fetch

```shell
git clone https://github.com/ssbc/patchwork
cd patchwork
```

## Build

With npm:

```shell
npm install
```

With yarn:

```shell
yarn
```
