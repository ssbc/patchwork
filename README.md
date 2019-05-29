# Patchwork

> A decentralized messaging and sharing app built on top of Secure Scuttlebutt (SSB).

It's better than email because:

- Private messages are end-to-end encrypted, always.
- You only get messages from people you follow so you can't get spamed.
- When you post public messages you'll only see replies from people you follow.
- The global mesh of append-only logs supports many data types, not just "mail".
- Users don't have to choose one public server ("pub") or trust any server.
- It's very easy to setup and maintain your own pub.

It's better than Twitter and Facebook because:

- Private messages are *always* end-to-end encrypted.
- It runs on your device so there's nobody tracking your browsing.
- It's built free and open source software so you can do what you want with it.
- Data is saved to your computer so the application works great offline.
- You can sync directly with friends over Wi-Fi and other LAN networks.

## Usage

Open Patchwork with an application shortcut or the CLI:

```shell
ssb-patchwork
```

![Screenshot of Patchwork][screenshot]

If you're new to Scuttlebutt you may need to connect to a [pub][pub] to join
the network. This will download messages from other people on the network.

1. Choose a pub from the [pub list][pub-list] and copy an invite code.
2. Open Patchwork and select *Join Pub*.
3. Paste the invite code and select *Redeem Invite*.

Your profile and the pub will follow each other so that they can synchronize
their messages. This initial synchronization may take a few minutes.

## Installation

Download the [latest binary release][latest] for your operating system or install
Patchwork with your favorite Node.js module package manager.

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
