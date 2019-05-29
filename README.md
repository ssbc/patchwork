# Patchwork

> A decentralized messaging and sharing app built on top of Secure Scuttlebutt (SSB).

- Spam can't happen because you only get messages from people you follow.
- Nobody can read your private messages because they're encrypted end-to-end.
- Patchwork works offline because the data you use is stored on your device.
- You can sync directly with nearby friends over Wi-Fi and other LAN networks.
- The software is free and open source so you can change and improve it.
- You don't have to trust any central servers or services with your data.

## Usage

![Screenshot of Patchwork][screenshot]

If you're new to Scuttlebutt you may need to connect to a [pub][pub] to join
the network. This will download messages from other people on the network.

1. Choose a pub from the [pub list][pub-list] and copy an invite code.
2. Open Patchwork and select *Join Pub*.
3. Paste the invite code and select *Redeem Invite*.

Your profile and the pub will follow each other so that they can synchronize
their messages. This initial synchronization may take a few minutes.

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
