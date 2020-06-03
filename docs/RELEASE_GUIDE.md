# How to make a patchwork release

## You will need

* To be a member of the `ssbc/patchwork` repository with push capabilities to `master`
* An npmjs.com account that's part of the ssbc, to publish the npm package

## Steps

1. Check out `master` and make sure you're 100% up-to-date with origin. `git fetch origin && git reset --hard origin/master` makes this pretty simple.

2. `npm version $whatever`, usually this will be `npm version patch` or `npm version minor` but when doing a prerelease you have to do `npm version prerelease --preid beta`. This is fine to do in `master` IMO because it isn't changing any code.

3. `git push --tags origin master` should push your commit **and the tag**, which should set off Travis which will push a draft release. Look at the [releases](https://github.com/ssbc/patchwork/releases) and you should see the draft.

4. Wait for all of the builds to finish, it takes ~10 minutes for macOS and Linux but ~25 minutes for Windows. Then you'll edit the draft, change the title from "1.0.0" to "Patchwork v1.0.0" and set a body with the output of `npm run --silent release-notes`.

5. If it's an alpha or beta make sure to tick the "this is a prerelease box" at the bottom, hit "preview" to make sure you haven't borked your Markdown, and then hit "publish" release.

6. Write up an announcement to publish on SSB. :)
