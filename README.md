# Patchwork

> A decentralized messaging and sharing app built on top of Secure Scuttlebutt (SSB).

- Connect with friends without depending on any central servers.
- Don't worry about spam, you only get messages from people you follow.
- Use Patchwork online or offline, the data you need is stored on your device.
- Sync messages with friends when you're on the same Wi-Fi network.
- Keep secrets with private messages, which are *always* end-to-end encrypted.
- Change and improve Patchwork however you'd like, it's free and open source.

## Usage

![Screenshot of Patchwork][screenshot]

New to Scuttlebutt? Join the network by connecting to a [pub][pub].

1. Choose a pub from the [pub list][pub-list] and copy an invite code.
2. Open Patchwork and select *Join Pub*.
3. Paste the invite code and select *Redeem Invite*.

You're done! Check out `#new-people` to see who else has recently joined.

## Installation

Get the [latest release from GitHub][latest] or install with a package manager.

With [npm][npm]:

```shell
npm install --global ssb-patchwork
```

With [yarn][yarn]:

```shell
yarn global add ssb-patchwork
```

With [yay][yay]:

```shell
yay -S ssb-patchwork
```

Need something else? Check out [`INSTALL.md`][install] for more information.

## See Also

- [patchbay][patchbay]
- [ssb-server][ssb-server]
- [manyverse][manyverse]

## License

AGPL-3.0

[install]: INSTALL.md
[latest]: https://github.com/ssbc/patchwork/releases/latest
[manyverse]: https://gitlab.com/staltz/manyverse
[npm]: https://npmjs.org/
[patchbay]: https://github.com/ssbc/patchbay
[pub-list]: https://github.com/ssbc/ssb-server/wiki/Pub-Servers
[pub]: https://www.scuttlebutt.nz/concepts/pub.html
[screenshot]: screenshot.jpg
[ssb-server]: https://github.com/ssbc/ssb-server
[yarn]: https://yarnpkg.com/en/
[yay]: https://github.com/Jguer/yay
