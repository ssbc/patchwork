var h = require('hyperscript')
var com = require('./index')
var app = require('../app')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')

exports.helpBody = function (item) {
  if (item == 'howto-pubs') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        h('strong', 'To get on the public mesh, you need a public node to follow you. '),
        'A public node is a usually a cloud server, but it could be any device with a public address. '
      ),
      h('br'),
      h('p',
        h('strong', 'During the alpha period, you have to know somebody that runs a public node. '),
        'Ask the node owner for an invite code, then ', com.a('#/sync', 'use the network-sync page'), ' to join their node.'
      ),
      h('br'),
      h('p',
        h('strong', 'If you\'re a neckbeard, you can set up a public node. '),
        'We have ', h('br'), h('a', { href: 'https://github.com/ssbc/scuttlebot', target: '_blank' }, 'detailed instructions'), ' available to help you get this done. '
      )
    )
  }
  if (item == 'howto-find-ppl') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        'Have your friend send you their ID. ',
        'Then, put it in the location bar (top center) and press enter. ',
        'If you need to download their data, Patchwork will prompt you to do so.'
      ),
      h('p',
        'To find your ID, open ', com.a('#/profile/'+app.user.id, 'your profile'), ' and copy it out of the location bar.'
      )
    )
  }
  if (item == 'howto-posts') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        h('strong', 'Go to the ', com.a('#/news', 'news feed')), ', click on the input box at the top and start typing. ',
        'When you\'re happy with your post, press Publish.'
      ),
      h('br'),
      h('p',
        h('strong', 'Markdown is supported, and you can mention other users by typing @, then their username. '),
        'If the mentioned users follow you, they\'ll see the message in their inbox.'
      ),
      h('br'),
      h('p',
        h('strong', 'You can insert emojis with the : character. '),
        'Check the ', h('a', { href: 'http://www.emoji-cheat-sheet.com/', target: '_blank' }, 'Emoji Cheat Sheet'), ' to see what\'s available.',
         h('.text-muted', { style: 'padding: 20px; padding-bottom: 10px' }, 'eg ":smile:" = ', h('img.emoji', { src: './img/emoji/smile.png', height: 20, width: 20}))
      )
    )
  }
  if (item == 'howto-webcam') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        h('strong', 'Go to the ', com.a('#/news', 'news feed')), ', then mouse over the ', com.icon('comment'), ' icon next to the input box at the top. ',
        'Click the ', com.icon('facetime-video'), ' icon to select the webcam tool.'
      ),
      h('br'),
      h('p',
        h('strong', 'Click and hold the video stream to record. '),
        'Alternatively, click the record 1/2/3s buttons to record for fixed durations. ',
        'You can record multiple times to put the clips together.'
      ),
      h('br'),
      h('p',
        h('strong', 'You can add a text message on the right. '),
        'As in text posts, you can put emojis and @-mentions in the text.'
      )
    )
  }
  if (item == 'howto-post-files') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        h('strong', 'Go to the ', com.a('#/news', 'news feed')), ', click on the input box at the top and start typing. ',
        'The input will expand, and you\'ll be shown a link to add attachments. ',
        'You can attach files up to 5MB.'
      ),
      h('br'),
      h('p',
        h('strong', 'If you want to embed a photo, attach it, then put an ! in front of the inserted link. '),
        'An example: '
      ),
      h('pre', '![my photo](&XXsJbhxj+kv1cAVJkc7jttb7/JFBkHYwMkQtxZmk+cQ=.sha256)')
    )
  }
  if (item == 'secret-messages') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        h('strong', 'Secret Messages'), ' are completely private messages. ',
        'They are encrypted end-to-end, which means the network operators can not read them. ',
        'The recipients, subject, and content are hidden. '
      ),
      h('br'),
      h('p',
        h('strong', 'The recipients ', h('em', 'must'), ' follow you to see the message. '),
        'If you happen to send a message to someone that doesn\'t follow you, ',
        'then they\'ll receive the message once they do follow you.'
      )
    )
  }
  if (item == 'howto-secret-messages') {
    return h('div', { style: 'padding: 20px' },
      h('p',
        'Open your ', com.a('#/inbox', 'inbox page'), ' and click "Secret Message." ',
        'Then, add your recipients, write the message, and click Send.'
      )
    )
  }
}


exports.helpTitle = function (item) {
  return ({
    'howto-pubs': 'How do I get onto the public mesh?',
    'howto-find-ppl': 'How do I find people?',
    'howto-posts': 'How do I make a new post?',
    'howto-webcam': 'How do I make a webcam gif?',
    'howto-post-files': 'How do I post a file or photo?',
    'secret-messages': 'What are secret messages?',
    'howto-secret-messages': 'How do I send a secret message?',
  })[item] || ''
}

exports.welcome = function () {
  return h('.message',
    h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
    h('.message-inner',
      h('ul.message-header.list-inline', h('li', h('strong', 'Patchwork'))),
      h('.message-body',
        h('.markdown', { style: 'margin-bottom: 10px' },
          h('h3', 'Hello! And welcome to ', h('strong', 'SSB.')),
          h('p', 
            'This program is an informal beta/demo for the SSB devs and our friends.'
          ),
          h('p', h('img.emoji', { src: './img/emoji/facepunch.png', height: 20, width: 20}), ' We fight for the user.')
        )
      )
    ),
    h('.message-comments',
      h('.message',
        h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
        h('.message-inner',
          h('ul.message-header.list-inline', h('li', h('strong', 'Patchwork'))),
          h('.message-body',
            h('.markdown',
              h('h4', 'Step 1: Join the public mesh ', h('img.emoji', { src: './img/emoji/computer.png', height: 20, width: 20})),
              h('p', 'To reach the rest of us, you need a Pub node to sync with you. '),
              h('.text-center', { style: 'padding: 7px; background: rgb(238, 238, 238); margin-bottom: 10px; border-radius: 5px;' },
                h('a.btn.btn-3d', { href: '#', onclick: modals.invite }, com.icon('cloud'), ' Join a Pub')
              )
            )
          )
        )
      ),
      h('.message',
        h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
        h('.message-inner',
          h('ul.message-header.list-inline', h('li', h('strong', 'Patchwork'))),
          h('.message-body',
            h('.markdown', { style: 'margin-bottom: 10px' },
              h('h4', 'Step 2: Follow people ', h('img.emoji', { src: './img/emoji/busts_in_silhouette.png', height: 20, width: 20})),
              h('p', 'Have people send you their @ IDs so you can follow them. Paste the ID into the location bar at the top, like it\'s a URL.')
            )
          )
        )
      ),
      h('.message',
        h('span.user-img', h('img', { src: com.profilePicUrl(false) })),
        h('.message-inner',
          h('ul.message-header.list-inline', h('li', h('strong', 'Patchwork'))),
          h('.message-body',
            h('.markdown', { style: 'margin-bottom: 10px' },
              h('h4', 'Step 3: ', h('img.emoji', { src: './img/emoji/metal.png', height: 20, width: 20})),
              h('p', 'You can publish ', h('strong', 'Messages and Files'), ' using the box at the top of your feed, and ', h('strong', 'Secret Messages'), ' via friends\' profile pages.')
            )
          )
        )
      )
    )
  )
}

exports.side = function () {
  function onhelp (topic) {
    return function (e) {
      e.preventDefault()
      subwindows.help(topic)
    }
  }

  function help (topic, text) {
    return [
      h('a', { style: 'color: #555', href: '#', onclick: onhelp(topic), title: text }, com.icon('question-sign'), ' ', text),
      h('br')
    ]
  }

  return h('div',
    h('strong', 'Help Topics:'), h('br'),
    h('a', { style: 'color: #555', href: '#', onclick: modals.invite }, com.icon('question-sign'), ' ',  'How do I get onto the public mesh?'), h('br'),
    help('howto-find-ppl', 'How do I find people?'),
    h('br'),
    help('howto-posts', 'How do I make a new post?'),
    help('howto-webcam', 'How do I make a webcam gif?'),
    help('howto-post-files', 'How do I post a file or photo?'),
    h('br'),
    help('secret-messages', 'What are secret messages?'),
    help('howto-secret-messages', 'How do I send a secret message?')
  )
}