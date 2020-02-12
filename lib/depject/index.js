module.exports = {
  patchwork: {
    about: {
      async: {
        'latest-values': require('./about/async/latest-values.js')
      },
      html: {
        image: require('./about/html/image.js'),
        link: require('./about/html/link.js')
      },
      obs: require('./about/obs.js'),
      sync: require('./about/sync.js')
    },
    app: {
      fullscreen: require('./app/fullscreen.js'),
      html: {
        'progress-notifier': require('./app/html/progress-notifier.js'),
        search: require('./app/html/search.js')
      },
      'link-preview': require('./app/link-preview.js'),
      sync: {
        'external-handler': {
          git: require('./app/sync/external-handler/git.js')
        }
      },
      views: require('./app/views.js')
    },
    backlinks: {
      obs: require('./backlinks/obs.js')
    },
    blob: {
      html: {
        input: require('./blob/html/input.js')
      },
      obs: {
        has: require('./blob/obs/has.js')
      },
      sync: {
        url: require('./blob/sync/url.js')
      }
    },
    channel: {
      async: {
        suggest: require('./channel/async/suggest.js')
      },
      html: {
        link: require('./channel/html/link.js'),
        preview: require('./channel/html/preview.js'),
        'subscribe-toggle': require('./channel/html/subscribe-toggle.js')
      },
      obs: {
        recent: require('./channel/obs/recent.js'),
        subscribed: require('./channel/obs/subscribed.js'),
        subscribers: require('./channel/obs/subscribers.js')
      },
      sync: {
        normalize: require('./channel/sync/normalize.js')
      }
    },
    contact: {
      async: require('./contact/async.js'),
      html: {
        'follow-toggle': require('./contact/html/follow-toggle.js')
      },
      obs: require('./contact/obs.js')
    },
    feed: {
      html: {
        'follow-warning': require('./feed/html/follow-warning.js'),
        'meta-summary': require('./feed/html/meta-summary.js'),
        rollup: require('./feed/html/rollup.js')
      },
      obs: {
        recent: require('./feed/obs/recent.js')
      }
    },
    gathering: {
      sheet: {
        edit: require('./gathering/sheet/edit.js')
      }
    },
    intl: {
      sync: {
        i18n: require('./intl/sync/i18n.js')
      }
    },
    invite: {
      invite: require('./invite/invite.js'),
      sheet: require('./invite/sheet.js')
    },
    keys: require('./keys.js'),
    message: {
      async: {
        name: require('./message/async/name.js'),
        publish: require('./message/async/publish.js')
      },
      html: {
        actions: require('./message/html/actions.js'),
        compose: require('./message/html/compose.js'),
        decorate: {
          'context-menu': require('./message/html/decorate/context-menu.js')
        },
        forks: require('./message/html/forks.js'),
        layout: {
          default: require('./message/html/layout/default.js'),
          mini: require('./message/html/layout/mini.js')
        },
        link: require('./message/html/link.js'),
        markdown: require('./message/html/markdown.js'),
        metas: require('./message/html/metas.js'),
        missing: require('./message/html/missing.js'),
        references: require('./message/html/references.js'),
        render: {
          about: require('./message/html/render/about.js'),
          attending: require('./message/html/render/attending.js'),
          blog: require('./message/html/render/blog.js'),
          channel: require('./message/html/render/channel.js'),
          following: require('./message/html/render/following.js'),
          gathering: require('./message/html/render/gathering.js'),
          issue: require('./message/html/render/issue.js'),
          'made-changes': require('./message/html/render/made-changes.js'),
          post: require('./message/html/render/post.js'),
          vote: require('./message/html/render/vote.js'),
          'zzz-fallback': require('./message/html/render/zzz-fallback.js')
        },
        timestamp: require('./message/html/timestamp.js')
      },
      obs: {
        author: require('./message/obs/author.js'),
        get: require('./message/obs/get.js'),
        likes: require('./message/obs/likes.js'),
        name: require('./message/obs/name.js')
      },
      sheet: {
        preview: require('./message/sheet/preview.js')
      },
      sync: {
        root: require('./message/sync/root.js'),
        timestamp: require('./message/sync/timestamp.js'),
        unbox: require('./message/sync/unbox.js')
      }
    },
    page: {
      html: {
        render: {
          all: require('./page/html/render/all.js'),
          channel: require('./page/html/render/channel.js'),
          channels: require('./page/html/render/channels.js'),
          gatherings: require('./page/html/render/gatherings.js'),
          mentions: require('./page/html/render/mentions.js'),
          message: require('./page/html/render/message.js'),
          participating: require('./page/html/render/participating.js'),
          private: require('./page/html/render/private.js'),
          profile: require('./page/html/render/profile.js'),
          public: require('./page/html/render/public.js'),
          search: require('./page/html/render/search.js'),
          settings: require('./page/html/render/settings.js'),
          tag: require('./page/html/render/tag.js'),
          'your-posts': require('./page/html/render/your-posts.js'),
          'attending-gatherings': require('./page/html/render/attending-gatherings.js')
        }
      }
    },
    profile: {
      async: {
        avatar: require('./profile/async/avatar.js'),
        suggest: require('./profile/async/suggest.js')
      },
      html: {
        person: require('./profile/html/person.js'),
        preview: require('./profile/html/preview.js')
      },
      obs: {
        contact: require('./profile/obs/contact.js'),
        rank: require('./profile/obs/rank.js'),
        'recently-updated': require('./profile/obs/recently-updated.js')
      },
      sheet: {
        edit: require('./profile/sheet/edit.js')
      }
    },
    progress: {
      html: {
        peer: require('./progress/html/peer.js'),
        render: require('./progress/html/render.js')
      },
      obs: require('./progress/obs.js')
    },
    sbot: require('./sbot.js'),
    sheet: {
      display: require('./sheet/display.js'),
      editTags: require('./sheet/editTags.js'),
      profiles: require('./sheet/profiles.js'),
      tags: {
        renderTaggers: require('./sheet/tags/renderTaggers.js'),
        renderTags: require('./sheet/tags/renderTags.js'),
        tags: require('./sheet/tags/tags.js')
      }
    },
    suggest: require('./suggest.js'),
    tag: {
      async: {
        suggest: require('./tag/async/suggest.js')
      },
      html: {
        tag: require('./tag/html/tag.js')
      }
    }
  }
}
