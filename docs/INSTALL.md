# Installation

The readme contains some information on the simplest installation methods, but
you can also install Patchwork by fetching from Git and building from source.

## Dependencies

- Git
- Node.js ([Active LTS][node-active-lts])
- npm or Yarn
- autoconf and automake
- libtool
- x11 and libxkbfile (Linux only)

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
  m4 \ 
  make
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

### NixOS

```shell
nix-shell -p nodejs autoconf automake libtool x11 xlibs.libxkbfile electron_8
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

If you receive 'No native build found' errors, try instead:

```shell
npm install --build-from-source
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

## Start

### npm

```shell
npm start
```

### Yarn

```shell
yarn start
```

## Sandbox

Some Linux users may see an error like this:

> The SUID sandbox helper binary was found, but is not configured correctly.
> Rather than run without sandboxing I'm aborting now. You need to make sure
> that node_modules/electron/dist/chrome-sandbox is owned by root and has mode
> 4755.

You have three options, pick the one that you think sucks the least:

1. Change your kernel settings: `sudo sysctl kernel.unprivileged_userns_clone=1`
2. Follow the instructions and change the file's owner to root
  - `sudo chown root node_modules/electron/dist/chrome-sandbox`
  - `sudo chmod 4755 node_modules/electron/dist/chrome-sandbox`
3. Disable the sandbox with either:
  - `npm start -- --no-sandbox`, or
  - `yarn start -- --no-sandbox`

See also:

- https://github.com/electron/electron/issues/17972
- https://github.com/electron-userland/electron-builder/issues/3872

### AppImage

Note that the `chown` and `chmod` solution doesn't work with AppImages, but you can launch the AppImage with the `--no-sandbox` flag appended to the command.

You can permanently patch the AppImage to add `--no-sandbox`, but that change is experimental and requires some [extra steps][appimage-fix].

[appimage-fix]: https://github.com/ssbc/patchwork/issues/1217#issuecomment-559609983
