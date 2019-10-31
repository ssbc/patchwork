# Installation

The readme contains some information on the simplest installation methods, but
you can also install Patchwork by fetching from Git and building from source.

## Dependencies

- Git
- Node.js ([Active LTS][node-active-lts])
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

[node-active-lts]: https://github.com/nodejs/Release#release-schedule

### Proxy

Normally, the application will follow your system settings to use a proxy, or you can set up a proxy by the 
following command line options.

```
--proxy-server=<SERVER>:<PORT>
--proxy-pac-url=<URL>
```

On Windows, please make sure to add -- before options. For example,
`C:\Users\YourUser\AppData\Local\Programs\ssb-patchwork\Patchwork.exe -- --proxy-server=....`
