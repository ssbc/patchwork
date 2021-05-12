# :warning: **Patchwork v3.18.1 was the last release!** :warning:

This release is meant to tide us over so that other clients can take it from here.

Thank you to everyone who contributed to this release and all the ones preceding it!
[Paul](https://github.com/pfrazee), [Matt McKegg](https://github.com/mmckegg), and [Christian Bundy](https://github.com/christianbundy) first and foremost, but by now the [contributors page](https://github.com/ssbc/patchwork/graphs/contributors) shows 94 contributors! 💓

### Where do we go from here? Do I have to change client now?

For the time being (the next couple of months) you should be fine to just keep Patchwork running. However, as time progresses and security of the underlying components "degrades" (read: already existing issues are *discovered*) it will become a bad idea to keep running Patchwork.
By that time, you should pick a different ssb client.

### Why retire Patchwork? Can I keep it alive?

Of course Patchwork is, as always, released under the AGPL license. So if you really wanted to, you could fork it and keep it alive. However, let me (Daan) explain why this is a bad idea:

**All the devs say "Don't do it!"**

Everyone who has spent significant time in the codebase agrees that it is time to retire Patchwork. Over the years, it has seen multiple iterations of developers coming in, trying to change things in a structural way, then burning out on it. It's a pattern, so be warned. This is due to the fact that Patchwork makes some architectural decisions that make it hard to maintain, and even harder for *new* developers to get into the codebase:

* **depject** is a bespoke dependency injection system, which breaks any kind of navigation and tool support for debugging.
* **mutant** is another bespoke implementation of observables. It is also used for generating HTML, which makes a transition to component-based UI toolkits very hard.
* **custom sbot**: Patchwork doesn't really work except with its own, bundled `ssb-server`. This is considered bad form for ssb applications.
* **ssb-db**, the bespoke database of the original ssb stack, is deeply baked into patchwork. Migrating to the new #ssb-db2 would be a long and painful process. This is compounded by the fact that patchwork bundles a few custom plugins for ssb-db.

I want to be clear that *none* of the above are impossible to solve; in fact, they all have straight-forward *but labour-intensive* solutions. I also want to be clear that these technological choices were all made for good reasons at the time, and I am sure you're as greatful to the developers who made them as I am, for putting their (overwhelmingly volunteered!) time into the project, and for making Patchwork the application that it is. In combination however, the above issues mean that new developers are faced with a very, very steep leaning curve before they're able to even make small changes. 
Given all of the above, it makes more sense to deprecate Patchwork and focus our efforts on projects like #oasis or #manyverse which are nearing feature parity with Patchwork. If you want to get involved with ssb development, both are great projects for that; they are much more hackable than Patchwork, and follow standard techniques & workflows, so you'll feel right at home.

**If you do, against all advice, want to continue developing Patchwork** then we kindly request you rename it to reflect the change in leadership.

--------------------------------

# Original Readme

> A decentralized messaging and sharing app built on top of Secure Scuttlebutt (SSB).

## Features

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

Most people should **[download Patchwork for Windows, macOS, or Linux][gh-dl]**.

Alternatively, you can install Patchwork with your favorite package manager.

- **[npm][npm]:** `npm install --global ssb-patchwork`
- **[yarn][yarn]:** `yarn global add ssb-patchwork`
- **[brew][brew]:** `brew cask install patchwork`
- **[yay][yay]:** `yay -S ssb-patchwork`

Building from source? Check out [`INSTALL.md`][install] for more information.

## Contributing

Create a [new issue][new-issue] to report problems or request features. See
[`CONTRIBUTING.md`][contributing] for more information on how to get involved.
You can also support the project via [donations](https://opencollective.com/patchwork/).

Please note that this project is released with a [Contributor Code of
Conduct][conduct]. By participating in this project you agree to abide by its
terms.

## See Also

- [patchbay][patchbay]
- [ssb-server][ssb-server]
- [manyverse][manyverse]

## License

[AGPL-3.0][license]

[brew]: https://brew.sh
[conduct]: docs/CODE_OF_CONDUCT.md
[contributing]: docs/CONTRIBUTING.md
[gh-dl]: https://github.com/ssbc/patchwork/releases/latest
[install]: docs/INSTALL.md
[license]: LICENSE
[manyverse]: https://gitlab.com/staltz/manyverse
[new-issue]: https://github.com/fraction/readme-boilerplate/issues/new
[npm]: https://npmjs.org/
[patchbay]: https://github.com/ssbc/patchbay
[pub-list]: https://github.com/ssbc/ssb-server/wiki/Pub-Servers
[pub]: https://www.scuttlebutt.nz/concepts/pub.html
[screenshot]: assets/screenshot.jpg
[ssb-server]: https://github.com/ssbc/ssb-server
[yarn]: https://yarnpkg.com/en/
[yay]: https://github.com/Jguer/yay
