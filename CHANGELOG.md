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
