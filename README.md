# Patchwork

![screenshot](./screenshot.png)

Patchwork is a decentralized sharing app.
It was built for friends of the SSB project, to test basic functions.
We use it as a test-bed for features, and for our own daily messaging.

Because SSB is a research project, **you'll need to contact an SSB team member (in #scuttlebutt on Freenode) to get onto the network!**
That's our informal barrier to entry right now, since we're not prepared for lots of users yet.

[![Hermies the Hermit Crab](https://avatars2.githubusercontent.com/u/10190339?v=3&s=200)](https://github.com/ssbc/scuttlebot)

Patchwork embeds [Scuttlebot](https://github.com/ssbc/scuttlebot), so if you're running Patchwork, you don't need to run another scuttlebot server.


## Install  (current stable)

This is the stable release. It will be the least likely to break.

**Dependencies:**

 - node v5.3.x (you might like to use [nvm](https://github.com/creationix/nvm))
 - npm v3.5.x ([Instructions to update NPM when using NVM](#updating-npm))

**Install:**

``` bash
npm install ssb-patchwork -g
```

**Run:**

```bash
patchwork
```

**Update:**

``` bash
npm install ssb-patchwork -g
```


## Install (bleeding edge)

This is the development version. It will contain updates not yet published on NPM.

**Dependencies:**

 - node v5.3.x (you might like to use [nvm](https://github.com/creationix/nvm))
 - npm v3.5.x ([Instructions to update NPM when using NVM](#updating-npm))

**Install:**

```bash
git clone https://github.com/ssbc/patchwork.git
cd patchwork
npm install
```

**Run:**

From directory you cloned patchwork to:

```bash
npm start
```

**Update:**

From directory you cloned patchwork to:

```bash
git pull origin master
npm install
```


## Updating NPM

Some people experience installation issues when using the npm version packaged with node 5.3.0. We have found upgrading to npm 3.5.x solves these issues.

If you are using nvm, you can update npm with the following steps:

``` bash
cd ~/.nvm/versions/node/v5.3.0/lib
npm install npm
```

## Docs

- [Building Patchwork](./docs/BUILDING.md)
- [Creating a Testing Environment, and Running Tests](./docs/TESTING.md)
- [Patchwork Project Structure](./docs/PROJECT-STRUCTURE.md)
- [SSB Docs Repo](https://github.com/ssbc/docs)
