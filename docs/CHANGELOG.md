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

## [Unreleased]

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

