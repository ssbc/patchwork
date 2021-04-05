const fs = require("fs");
const fsPath = require("path");
const { computed, h, Value } = require("mutant");
const nest = require("depnest");
const ssbMnemonic = require("ssb-keys-mnemonic");
const watch = require("mutant/watch");

exports.needs = nest({
  "message.html.markdown": "first",
  "intl.sync.i18n": "first",
  "keys.sync.load": "first",
});

exports.gives = nest("page.html.render");

exports.create = function (api) {
  return nest("page.html.render", function channel(path) {
    const assetPath = fsPath.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "assets",
      "mnemonic_warning.md"
    );
    const markdown = api.message.html.markdown
    const warningText = fs.readFileSync(assetPath, "utf8");
    const warningHtml = markdown(warningText);

    const confirmationText = Value("");

    if (path !== "/mnemonic") return;
    const i18n = api.intl.sync.i18n;

    const keys = api.keys.sync.load();
    const words = ssbMnemonic.keysToWords(keys).split(" ");
    const wordBatches = [];
    const maxLen = words.reduce(
      (currMax, currWord) =>
        currWord.length > currMax ? currWord.length : currMax,
      0
    );
    for (let i = 0; i < words.length; i = i + 4) {
      const batchLine = words
        .slice(i, i + 4)
        .map((s) => s.padEnd(maxLen, " "))
        .join("  ");
      wordBatches.push(batchLine);
    }
    const mnemonic = wordBatches.join("\n");

    const prepend = [
      h("PageHeading", [h("h1", [h("strong", i18n("Key Export"))])]),
    ];

    const content = [h("section", warningHtml), h("hr")];

    let showNextChallenge = Value(false)
    const showFirstChallenge = showNextChallenge
    content.push(
      h(
        "form",
        {
          style: {
            margin: "1em auto",
          },
          action: "",
          "ev-submit": (ev) => {
            ev.preventDefault();
            showFirstChallenge.set(true);
          },
        },
        h(
          "button",
          {
            disabled: showFirstChallenge,
            style: {
              margin: "1em auto",
              "background-color": "#51c067",
              color: "white",
            },
          },
          "I still want to export my keys"
        ),
      )
    );

    function addChallenge(challenge, response) {
      const showChalllenge = showNextChallenge;
      const showNext = Value(false);
      content.push(
        h(
          "section",
          { hidden: computed(showChalllenge, (b) => !b) },
          challenge
        ),
        h(
          "form",
          {
            hidden: computed(showChalllenge, (b) => !b),
            style: {
              margin: "1em auto",
            },
            action: "",
            "ev-submit": (ev) => {
              ev.preventDefault();
              if (confirmationText().toLowerCase() === response.toLowerCase()) {
                showNext.set(true);
              }
            },
          },
          [
            h("input", {
              disabled: showNext,
              hooks: [ValueHook(confirmationText), ScrollHook(showChalllenge)],
              size: response.length + 1 < 30 ? 30 : response.length + 1,
              "ev-paste": (ev) => {
                ev.preventDefault();
              },
            }),
          ]
        )
      );
      showNextChallenge = showNext
    }

    addChallenge(
      [
        markdown('> ' + i18n("To confirm you understand the risks and responsibilities here, we will play a little game. Are you ready?")),
        i18n("Type 'yes' and it return to continue"),
      ],
      i18n('yes'),
    );
    addChallenge(
      markdown('> ' + i18n("This will be annoying and slow. That's intentional. It's a feature, not a bug. You really need to understand that we can't help you if this goes wrong. Type 'I understand' to confirm")),
      i18n('I understand'),
    );
    addChallenge(
      markdown('> ' + i18n("Good. You'll answer a bunch of questions. The prize for getting them right is one giant foot-gun. Aka: your key export\nLet's start easy: What's the name of the person posting the bird picture?")),
      i18n('Carol'),
    );
    addChallenge(
      markdown('> ' + i18n("Excellent job. And that's the same person as the one posting about #foffee, right?")),
      i18n('no'),
    );
    addChallenge(
      markdown('> ' + i18n("Well *someone* has been paying attention. Good catch! So, who was it then?")),
      i18n('Alice'),
    );
    addChallenge(
      markdown('> ' + i18n("You made it quite far into the text, that's good news!\nChange of gears: Will this procedure allow you to use the same identity on multiple two or more devices?")),
      i18n('no'),
    );
    const sameAsChallenge = i18n('I understand that exporting my key will not allow me to use it on more than one device.')
    addChallenge(
      markdown('> ' + i18n("That's right. But let's be clear here. Please type this out:")+'\n> '+sameAsChallenge),
      sameAsChallenge,
    );
    addChallenge(
      markdown('> ' + i18n("At which step of the process does manyverse become the sole holder of your identity?")),
      i18n('9'),
    );
    addChallenge(
      markdown('> ' + i18n("Correct. Just after you import the key.\nIs it safe to post at that point then?")),
      i18n('no'),
    );
    addChallenge(
      markdown('> ' + i18n("Okay, looks like you're getting it. One last one then:\nIf any of this goes wrong, who can most likely help you?\n* The patchwork devs\n* The manyverse devs\n* Nobody")),
      i18n('nobody'),
    );

    content.push(
      h("hr", { hidden: computed(showNextChallenge, (b) => !b) }),
      h("div", { hidden: computed(showNextChallenge, (b) => !b) }, [
        h("p", i18n("Congrats, you made it. Here your mnemonic representation of your secret:")),
        h("pre.mnemonic", {
              hooks: [ScrollHook(showNextChallenge)],
        }, mnemonic),
        h(
          "p",
          i18n(
            "Again: be very careful with it. Keep it secret, and don't use this key on multiple devices, including this one."
          )
        ),
      ])
    );

    return h("Scroller", { style: { overflow: "auto" } }, [
      h("div.wrapper", [
        h(
          "section.prepend",
          h("PageHeading", [h("h1", [h("strong", i18n("Key Export"))])])
        ),
        h("section.content", content),
      ]),
    ]);
  });
};

function ValueHook(obs) {
  return function (element) {
    element.value = obs();
    element.oninput = function () {
      obs.set(element.value.trim());
    };
  };
}

function ScrollHook(obs) {
  return function(element) {
    var scrolledOnce = false
    watch(obs, (visible) => {
      if (!scrolledOnce && visible) {
        scrolledOnce = true
        element.scrollIntoViewIfNeeded()
        try {
          element.focus()
        } catch {}
      }
    })
  }
}
