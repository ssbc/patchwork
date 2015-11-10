# Project Structure

Overview of the asset- and code-structure of Patchwork.

## `/app`

Electron main-process code.
Loads Scuttlebot, adds `/api` to sbot as a plugin, and opens `/ui` in a BrowserWindow.

| Name | Desc |
|------|------|
| `index.js` | Electron entry-point. |
| `lib/windows.js` | Window-management toolset. |
| `lib/blobs.js` | HTTP server for Scuttlebot's blob-store. |
| `lib/menu.js` | Definition for the window's permanent menu. |
| `lib/muxrpc-ipc.js` | RPC interface to BrowserWindows. |

## `/api`

RPC methods and message-processing, added to the `scuttlebot` object as a plugin.

| Name | Desc |
|------|------|
| `index.js` | Plugin entry point. Sets up message-processing and defines the API methods. |
| `processor.js` | Message-processing behaviors. |
| `util.js` | Overly-big bag of helpers. Includes toolset for in-memory indexes. |
| `manifest.js` | RPC manifest. |
| `permissions.js` | RPC permissions. |
| `test/*` | API tests. |

## `/ui`

Electron ui-process code.
Uses React.
Mostly compiled with babel, and therefore written in ES6+JSX.

| Name | Desc |
|------|------|
| `main.html` | Entry page. |
| `main.js` | JS entry point. Registers babel, loads `app` master-state, and starts rendering. |
| `router.jsx` | Routes definitions. |
| `layout.jsx` | Master app layout. |
| `views/*` | Views loaded by the router. |
| `com/*` | UI components, used by the views and by each other. |
| `lib/app.js` | Master state object. |
| `lib/markdown.js` | Markdown behaviors (inline, block). |
| `lib/muxrpc-ipc.js` | RPC interface to the main process. |
| `lib/mentions.js` | Helpers for extracting SSB link-mentions out of text. |
| `lib/msg-relation.js` | Helpers for message-processing. |
| `lib/social-graph.js` | Helpers for analyzing the social graph. |
| `lib/util.js` | Overly-big bag of helpers. |
| `less/*` | Styles, in less. |
| `css/*` | Compiled styles. The output of `ui/less/*`. Read-only, don't modify directly. |
| `img/*` | Static assets. |
| `fonts/*` | Static assets. |
| `vendor/*` | Static assets (js). May not be in use anymore. |
| `webview-preload.js` | Script preloaded into webview elements, to setup RPC. |

## `/assets`

Assets for building the Electron package (mainly icons).

## `/scripts`

Helpers for the build-process.