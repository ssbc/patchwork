# Project Structure

Overview of the asset- and code-structure of Patchwork.

## `/app`

Electron main-process code.
Loads Scuttlebot, adds `/api` to sbot as a plugin, and opens `/ui` in a BrowserWindow.

| Name | Desc |
|------|------|
| `/app/index.js` | Electron entry-point. |
| `/app/lib/windows.js` | Window-management toolset. |
| `/app/lib/blobs.js` | HTTP server for Scuttlebot's blob-store. |
| `/app/lib/menu.js` | Definition for the window's permanent menu. |
| `/app/lib/muxrpc-ipc.js` | RPC interface to BrowserWindows. |

## `/api`

RPC methods and message-processing, added to the `scuttlebot` object as a plugin.

| Name | Desc |
|------|------|
| `/ui/index.js` | Plugin entry point. Sets up message-processing and defines the API methods. |
| `/ui/processor.js` | Message-processing behaviors. |
| `/ui/util.js` | Overly-big bag of helpers. Includes toolset for in-memory indexes. |
| `/ui/manifest.js` | RPC manifest. |
| `/ui/permissions.js` | RPC permissions. |
| `/ui/test/*` | API tests. |

## `/ui`

Electron ui-process code.
Uses React.
Mostly compiled with babel, and therefore written in ES6+JSX.

| Name | Desc |
|------|------|
| `/ui/main.html` | Entry page. |
| `/ui/main.js` | JS entry point. Registers babel, loads the `app` master-state-object, and renders the root react elements (the routes). |
| `/ui/router.jsx` | Routes definitions. |
| `/ui/layout.jsx` | Master app layout. |
| `/ui/views/*` | Views loaded by the router. |
| `/ui/com/*` | UI components, used by the views and by each other. |
| `/ui/lib/app.js` | Master state object. |
| `/ui/lib/markdown.js` | Markdown behaviors (inline, block). |
| `/ui/lib/muxrpc-ipc.js` | RPC interface to the main process. |
| `/ui/lib/mentions.js` | Helpers for extracting SSB link-mentions out of text. |
| `/ui/lib/msg-relation.js` | Helpers for message-processing. |
| `/ui/lib/social-graph.js` | Helpers for analyzing the social graph. |
| `/ui/lib/util.js` | Overly-big bag of helpers. |
| `/ui/less/*` | Styles, in less. |
| `/ui/css/*` | Compiled styles. The output of `/ui/less/*`. Read-only, don't modify directly. |
| `/ui/img/*` | Static assets. |
| `/ui/fonts/*` | Static assets. |
| `/ui/vendor/*` | Static assets (js). May not be in use anymore. |
| `/ui/webview-preload.js` | Script preloaded into webview elements, to setup RPC. |

## `/assets`

Assets for building the Electron package (mainly icons).

## `/scripts`

Helpers for the build-process.