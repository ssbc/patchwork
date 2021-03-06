const { shell, clipboard } = require('electron')
const { BrowserWindow, ContextMenuParams, ipcMain, MenuItemConstructorOptions, WebContents } = require('electron')
const contextMenu = require('electron-context-menu')
const ref = require('ssb-ref')

// used to receive out-of-band information about context-menu events
// see below, Ctrl-F "context-menu-info"
var lastClickInfo;

module.exports = function (
  config,
  serverDevToolsCallback,
  navigateHandler,
  window
) {
  ipcMain.handle("context-menu-info", (event, info) => {
    lastClickInfo = info;
    return true;
  });
  contextMenu({
    window,
    menu: (defaultActions, parameters, _, dictionarySuggestions) => {
      // elementAtPosition(window, parameters.x, parameters.y)
      const isFileProtocol = parameters.linkURL.startsWith("file:");

      // This is very similar to the boilerplate from electron-context-menu even
      // though we don't use all the options. Some of the options are disabled
      // via "condition && " guards just to clarify where we differ from the
      // boilerplate.
      // See the original menu structure here:
      // https://github.com/sindresorhus/electron-context-menu/blob/621c29a8a133925ac25529e4bea2a738394e8609/index.js#L230
      // We could probably get away with heavy, heavy modification instead of
      // menu but this seems more understandable, all things considered
      let menuTemplate = [
        dictionarySuggestions.length > 0 && defaultActions.separator(),
        ...dictionarySuggestions,
        defaultActions.separator(),

        defaultActions.learnSpelling(),
        defaultActions.separator(),

        defaultActions.lookUpSelection(),
        defaultActions.separator(),

        searchwithDDG(parameters), // instead of defaultActions.searchWithGoogle()
        defaultActions.separator(),

        defaultActions.cut(),
        defaultActions.copy(),
        defaultActions.paste(),
        defaultActions.separator(),

        // We typically don't want to copy links, only external ones
        copyEmbedMd(parameters),
        copyMsgText(window),
        // this and the next one might return the same id. Bit redundant but
        // only if we right-click on the message timestamp or such
        copyMsgKey(),
        copyRef(parameters),
        copyEmail(parameters),
        // We could make our own copyLink() instead which sets
        // visible: !isFileProtocol but this is easier
        !isFileProtocol && defaultActions.copyLink(),
        copyExternalLink(config),
        openOnExternalViewer(config),
        findRefs(parameters, navigateHandler),
        defaultActions.separator(),

        openMediaInBrowser(parameters),
        defaultActions.saveImage(),
        defaultActions.saveImageAs(),
        defaultActions.copyImage(),
        defaultActions.copyImageAddress(),
        defaultActions.separator(),

        // this could trigger a web request from within patchwork and we don't want that
        false && defaultActions.saveLinkAs(),
        defaultActions.separator(),

        defaultActions.inspect(),
        openServerDevTools(serverDevToolsCallback),
        defaultActions.services(),
        defaultActions.separator(),

        reloadWindow(),
      ];

      return menuTemplate;
    },
  });
};

// Every function below here will produce one MenuItemConstructorOptions object

function copyMsgKey() {
  const msgKey = lastClickInfo?.msg?.key
  return {
    label: "Copy Message Reference",
    visible: !!msgKey,
    click: function () {
      clipboard.writeText(msgKey)
    }
  }
}

function copyMsgText(window) {
  const msgKey = lastClickInfo?.msg?.key
  return {
    label: "Copy Message Text",
    visible: !!msgKey,
    click: function () {
      window.webContents.send('copy-message-text', msgKey)
    },
  };
}

function openOnExternalViewer(config) {
  const msgKey = lastClickInfo?.msg?.key
  return {
    label: 'Open In Online Viewer',
    visible: !!msgKey,
    click: function () {
      const key = msgKey
      const gateway = config.gateway ||
        'https://viewer.scuttlebot.io'
      const url = `${gateway}/${encodeURIComponent(key)}`
      shell.openExternal(url);
    }
  }
}

function copyExternalLink(config) {
  const msgKey = lastClickInfo?.msg?.key
  return {
    label: 'Copy External Link',
    visible: !!msgKey,
    click: function () {
      const key = msgKey
      const gateway = config.gateway ||
        'https://viewer.scuttlebot.io'
      const url = `${gateway}/${encodeURIComponent(key)}`
      clipboard.writeText(url)
    }
  }
}

function findRefs(parameters, navigate) {
  const extractedRef =
    parameters.mediaType === "none"
      ? ref.extract(parameters.linkURL)
      : ref.extract(parameters.srcURL);
  const usageOrRef = extractedRef && parameters.mediaType === "none"
  ? 'References To'
  : 'Usages Of'
  const label = !!extractedRef
    ? `Find ${usageOrRef} ${extractedRef.slice(0, 10).replaceAll("&", "&&&")}...`
    : "";
  return {
    label,
    visible: !!extractedRef,
    click: () => {
      navigate(`?${extractedRef}`);
    },
  };
}

function copyRef(parameters) {
  const extractedRef =
    parameters.mediaType === "none"
      ? ref.extract(parameters.linkURL)
      : ref.extract(parameters.srcURL);
  const label = !!extractedRef
    ? `Copy Reference ${extractedRef.slice(0, 10).replaceAll("&", "&&&")}...`
    : "";
  return {
    label,
    visible: !!extractedRef,
    click: () => {
      clipboard.writeText(extractedRef);
    },
  };
}

function copyEmail(parameters) {
  return {
    label: "Copy Email Address",
    // FIXME: this fails for "mailto:" links that actually are hand-coded in markdown
    // example: Mail me at my [work address](mailto:daan@business.corp)
    visible: parameters.linkURL.startsWith("mailto:"),
    click: () => {
      // Omit the mailto: portion of the link; we just want the address
      clipboard.writeText(parameters.linkText);
    },
  };
}

function copyEmbedMd(parameters) {
  return {
    label: "Copy Embed Markdown",
    visible: parameters.mediaType !== "none",
    click: () => {
      const extractedRef = ref.extract(parameters.srcURL);
      clipboard.writeText(`![${parameters.titleText}](${extractedRef})`);
    },
  };
}

function openMediaInBrowser(parameters) {
  return {
    label: "Open With Browser",
    visible: parameters.mediaType !== "none",
    click: () => {
      shell.openExternal(parameters.srcURL);
    },
  };
}

function searchwithDDG(parameters) {
  return {
    label: "Search With DuckDuckGo",
    // Only show it when right-clicking text
    visible: parameters.selectionText.trim().length > 0,
    click: () => {
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(
        parameters.selectionText
      )}`;
      shell.openExternal(url);
    },
  };
}

function reloadWindow() {
  return {
    label: "Reload",
    click: function (item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.reload();
      }
    },
  };
}

function openServerDevTools(serverDevToolsCallback) {
  return {
    label: "Inspect Server Process",
    click: serverDevToolsCallback,
  };
}