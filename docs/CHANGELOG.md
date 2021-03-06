# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
## [Unreleased]
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
-->

## v3.18.1 - 2021-04-05

**Last proper release of Patchwork!**
That's right folks. This is it. Nearly six years after the initial commit by Paul, the time of Patchwork will come to an end. 

**This is the last release of Patchwork**
**There will be no further development on Patchwork.**
**Issue tracker and pull requests will be closed.**

This release is meant to tide us over so that other clients can take it from here.

### Where do I go from here?

For the time being (the next couple of months) you should be fine to just keep Patchwork running.
However, as time progresses and security of the underlying components "degrades" (read: already existing issues are *discovered*) it will become a bad idea to keep running Patchwork.
By that time, you should pick a different ssb client.

### Why retire Patchwork? Can I keep it alive?

Of course Patchwork is, as always, released under the AGPL license. So if you really wanted to, you could fork it and keep it alive. However, let me (Daan) explain why this is a bad idea:

**All the devs say "Don't do it!"**

Everyone who has spent significant time in the codebase agrees that it is time to retire Patchwork.
Over the years, it has seen multiple iterations of developers coming in, trying to change things in a structural way, then burning out on it. It's a pattern, so be warned.
This is due to the fact that Patchwork makes some architectural decisions that make it hard to maintain, and even harder for *new* developers to get into the codebase:

* **depject** is a bespoke dependency injection system, which breaks any kind of navigation and tool support for debugging.
* **mutant** is another bespoke implementation of observables. It is also used for generating HTML, which makes a transition to component-based UI toolkits very hard.
* **custom sbot**: Patchwork doesn't really work except with its own, bundled `ssb-server`. This is considered bad form; ssb applications should *really* be able to peacefully co-exist.
* **ssb-db**, the bespoke database of the original ssb stack, is deeply baked into patchwork. Migrating to the new [ssb-db2](https://github.com/ssb-ngi-pointer/ssb-db2) would be a long and painful process. This is compounded by the fact that patchwork bundles a few custom plugins for ssb-db.

I want to be clear that *none* of the above are impossible to solve; in fact, they all have straight-forward *but labour-intensive* solutions.
I also want to be clear that these technological choices were all made for good reasons at the time, and I am sure you're as greatful to the developers who made them as I am, for putting their (overwhelmingly volunteered!) time into the project, and for making Patchwork the application that it is.
In combination however, the above issues mean that new developers are faced with a very, very steep leaning curve before they're able to even make small changes. 
Given all of the above, it makes more sense to deprecate Patchwork and focus our efforts on projects like [oasis](https://github.com/fraction/oasis) or [manyverse](https://gitlab.com/staltz/manyverse) which are nearing feature parity with Patchwork.
If you want to get involved with ssb development, both are great projects for that; they are much more hackable than Patchwork, and follow standard techniques & workflows, so you'll feel right at home.

**If you do, against all advice, want to continue developing Patchwork** then we kindly request you rename it to reflect the change in leadership.

### Added
* Builds for arm64 & armv7l Linux
* Spellchecking: add ability to select multiple languages or to disable it completely.
* Rudimentary Status page shows index progress per view
* Context menus are much richer now, allowing to copy media & open things in Browser both locally and on a public viewer.

### Deprecated

* Use of depject had been deprecated for a long while.
  As a proof of concept, some modules in this release were now migrated from depject to regular imports.

### Security

* A metric ton of version bumps, most notably including electron (now `v11.3.0`) and chloride.
  The result is a much snappier experience and virtually no "falling back to JS crypto" slowness.

## v3.18.1-beta.2 - 2021-01-17

### Added

* Farsi translation by @dev0p0 (#1313)

### Changed

* While publishing a message, the content warning will be `trim()`'ed of leading and trailing whitespace. If the result is empty, no content warning will be published.

### Fixed

* Drop-down for blocking feeds was not showing (#1328, fixed in #1368)
* Correct Brazilian Portuguese translation (#1327, thanks to @fabiocosta0305)
* Correction to French translation (#1298, thanks to @BorisPAING)
* One for the language enthusiasts: "who" -> "whom" (#1307, thank you @RichardLitt!)

### Security

* Many version bumps, including some security updates in direct and transitive dependencies.

## v3.18.0 - 2020-06-03

### Added

- Support for DHT invites as generated by
  [manyverse](https://gitlab.com/staltz/manyverse) (#1246) added by @staltz.
  This is the headline feature of this release. DHT invites are one of the more
  promising ways to improve the onboarding experience without a pub.
  We invite everyone to test this feature out. Invite a friend or family member
  to SSB, tell us how it worked, we're eager to iterate on this!
- Show last user activity on profile pages and mouse-over popups (#1289, #1290)
- Add [Dracula](https://draculatheme.com)-inspired theme (#1294, #1295)
- You can now type `/profile` into the search bar to visit your own profile.
  (#1287) Handy in combination with using `Ctrl+L` (`Cmd+L` on MacOS) to
  activate the search bar.
- When using `Ctrl/Cmd+Return` to publish a message, a second push of
  `Ctrl/Cmd+Return` will now confirm the publication, while `Esc` or simply
  `Return` (without the `Ctrl/Cmd` modifier) will cancel the publish and return
  back to editing the message (#1286)

### Fixed

- Non-square profile pictures are no longer stretched/compressed in the private
  messages tab (#1276)
- Update locales, especially French (#1275, #1278, #1280, #1281)

## v3.17.7 - 2020-04-07

### Added

- Add NL locale (#1268)

### Changed

- Update Acorn dependency (#1266)

### Fixed

- Fix profile header CSS (#1265 #1267)
- Fix FR locale (#1262)

## v3.17.6 - 2020-03-10

### Added

- Add donation link to readme

### Fixed

- Fixed squished images
- Fixed confusing private message error
- Fixed SSB-Backlinks for performance boost

## v3.17.5 - 2020-02-21

### Fixed

- Fixed regression by upgrading SSB-CONN to 0.16.2 (https://github.com/ssbc/patchwork/pull/1253)

## v3.17.4 - 2020-02-19

### Fixed

- Fixed problem where URL mention breaks publishing.

## v3.17.3 - 2020-02-17

### Added

- Add ia32 build target (#1235)

### Changed

- Update SSB-CONN (#1241, #1242)
- Update all npm dependencies (#1247)

### Fixed

- Fix global shortcut breaking other windows (#1243)

## v3.17.2 - 2019-12-28

### Added

- Add Cmd+, or Ctrl+, keyboard shortcut for settings (#1209)
- Add Homebrew install instructions to the readme (#1211)
- Add sandbox documentation for Linux (#1218)
- Add support for SSB-Rooms ( #1219)
- Add localization for timestamps with Moment (#1227)

### Fixed

- Fix connection progress regression (#1210)
- Fix release notes (#1214)
- Fix Spanish localization (#1220)
- Fix flashing sidebar UI (#1228)

## v3.17.1 - 2019-11-26

### Added

- Add custom language support to spell checker (#1199)
- Add documentation about proxy configuration (#1196)
- Add documentation about "good first issue" label (#1194)
- Add attending gatherings view (#1182)
- Add context menu to open image in web browser (#1163)
- Add documentation about Patchwork Design principles (#1151)
- Add content warnings (#1176)

### Changed

- Replace ssb-gossip with ssb-conn for improved replication (#1178)
- Improve Russian translation (#1200)
- Upgrade all dependencies, including upgrade to Electron 6 (#1199)
- Re-enable ssb-ebt for improved replication (#1106)

### Fixed

- Fix KIO bug causing problems for KDE users (#1204)
- Fix typo in French translation (#1201)
- Fix inconsistent border radius between themes (#1191)

## v3.16.2 - 2019-08-21

### Fixed
- Infinite indexing bug related to ssb-legacy-conn upgrade (#1172)
- Message click not working related to URI component decoding (#1171)

## v3.16.0 - 2019-08-20

### Added
- Content warning support (#1159)
- Recent changes from changelog to release notes (#1155)
- Unicode hashtag support with ssb-markdown upgrade (#1168)

### Changed
- Refactor to remove unused code (#1153)
- Refactor to remove bulk-require module (#1158)
- Switch from ssb-gossip to ssb-legacy-conn

### Fixed
- "Could not get message" bug on gatherings (#1166)
- Your gatherings not showing in gathering feed (#1167)
- Encoded URI bug when previewing profile with hover (#1169)

## v3.15.0 - 2019-08-08

### Added
- Developer script to output release notes (#1095)
- Documentation for which versions of Node we can support (#1115)
- Esperanto translation (#1126)
- Option to delete feeds from blocked authors (#1026)
- Traditional Chinese translation (#1130)

### Changed
- Encode emoji as unicode character instead of `:shortcode` (#1105)
- Switch input textarea font from monospace to sans-serif (#1120)
- Refactor to remove unused code (#1122)
- Increase size of emoji in helper (#1139)
- Upgrade JavaScript dependencies (#1141)

### Fixed
- Fixed corners of avatar images in private messages not matching up (#1075)
- Spanish typo for public messages (#1113)
- Bug where gathering was showing as "private" in preview (#1131)
- Mistranslations in Simplified Chinese (#1137)

## v3.14.1 - 2019-06-17

### Fixed
- Resolved inconsistent emoji rendering from `:shortcode:` inconsistencies.

## v3.14.0 - 2019-06-17

### Added
- Improved emoji support, Patchwork now has more emoji in a better font.
- Developer warning when trying to start Patchwork twice.

### Changed
- Reorganized directory structure,, improved readme and contributor guide.
- Update check on startup now happens every 24 hours.
- Switched to system font instead of using Arial everywhere.

### Fixed
- Stopped automatically turning ascii emoji like ":)" into their respective image emoji.
- Liberated code in posts from its tiny box with a scroll bar.

## v3.13.0 - 2019-06-10

### Added
- Font selection in settings menu.

### Fixed
- Fixed emoji not rendering on Windows.
- Solved problem where private messages with 7 recipients wouldn't work.

## v3.12.0 - 2019-05-21

### Added
- Explanation when messages in a thread are hidden because the author is blocked by the author of the thread.
- Confirmation dialog when clearing message drafts.
- Ctrl/Cmd+L keyboard shortcut which selects the search field.
- Read-only mode, which doesn't allow users to publish new messages until indexes are up-to-date. This resolves issues where Patchwork seems unresponsive so users repeatedly post the same message.
- Greek translation.
- Support for clicking magnet links.
- Auto-build with Travis CI (now supporting Snappy and Debian).
- Changelog.

### Changed
- Made legacy block handling easier to understand with new options on the profile page.
- Switched to a new module, ssb-suggest, to take care of @mention suggestions.
- Replaced "Search with Google" with "Search with DuckDuckGo" in the context menu.
- Started using an experimental branch of ssb-config that automatically configures multiple network interfaces so that they can be broadcast correctly by multiserver.
- Updated and deduplicated some npm dependencies.

### Removed
- Irrelevant prebuilds from build artifacts, which were bloating the size of releases.

### Fixed
- Problem where Patchwork would prompt user to add a name and description even when it wasn't their first time opening the application.
- Pagination bug that wasn't correctly showing messages on private, public, and profile feeds.
- EXIF stripping, which only works on JPG, TIF, and WAV files. Images that were converted from JPG/TIF/WAV may still have EXIF metadata embedded somewhere in the file, so it's important to know that Patchwork only rmeoves EXIF metadata from JPG/TIF/WAV.

