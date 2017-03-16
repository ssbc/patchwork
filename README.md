<h1 align="center">
  <img
    alt="Patchwork icon"
    src="https://github.com/ssbc/patchwork-icons/raw/master/rainbow-hermies/256x256.png"
    width="256"
    height="256"
  />
  <br />
  Patchwork
</h1>

<h4 align="center">
  A decentralized messaging and sharing app built on top of Secure Scuttlebutt (SSB).
</h4>

![Patchwork screenshot](screenshot.jpg)

<details>
  <summary>Table of Contents</summary>
  <li><a href="#features">Features</a></li>
  <li><a href="#pubs">Pubs</a></li>
  <li><a href="#install">Install</a></li>
  <li><a href="#docs">Docs</a></li>
</details>

## Features

It's better than email because:

 - Private messages are end-to-end encrypted, always.
 - You have to follow somebody to get messages from them, so you won't get spammed.
 - Your mail can be public broadcasts or private, and you'll only see replies by people you follow.
 - The datastructure is a global mesh of append-only logs, which can support new types of data (not just "mail").
 - Users are not bound to one server/host (what we call "pubs") and do not have to trust the servers.
 - It's very easy to setup and maintain your own pub.

It's better than twitter and facebook because:

 - Private messages are end-to-end encrypted, always.
 - The software runs on your device, so there's nobody tracking your browsing.
 - The application-code is FOSS, so you're free to fork or write new applications without a gatekeeper setting terms.
 - Data is saved to your disk, and so the application works offline.
 - You can sync directly with friends over the wifi. 

## Pubs

In order to gossip outside your local network, you'll need to connect to a [Pub](https://www.scuttlebutt.nz/concepts/pub.md).

Here are a list of available Pubs offering public invites:

- [ssb.rootsystems.nz](http://ssb.rootsystems.nz)

In `patchwork`, click "+ Join Pub" and paste the code.

This will cause you to follow the Pub and vise versa. If you haven't synchronized to this social network yet, prepare to wait a few minutes while your local server synchronizes.

## Install

Download installers for Windows, macOS and Linux from [patchwork/releases](https://github.com/ssbc/patchwork/releases)

Or you can build from source with node and npm installed:

```shell
$ git clone https://github.com/ssbc/patchwork
$ cd patchwork
$ npm install
$ npm start
```

On linux you'll need some more dependencies for the spell-checker. On debian:

```shell
sudo apt-get install libxext-dev libxtst-dev libxkbfile-dev
```

## Docs

- [scuttlebutt.nz](https://www.scuttlebutt.nz)
- [scuttlebot.io](https://scuttlebot.io)
