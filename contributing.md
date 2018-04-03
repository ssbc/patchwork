# Patchwork Contribution Guidelines

Maintained by @mmckegg

## Please ensure all submitted code conforms to [JavaScript Standard Style](https://standardjs.com/)

You can run `npm test` or `npx standard` to run the linter. A lot of small issues can be automatically fixed using `npx standard --fix`.

## Feel free to use [depject](https://github.com/depject/depject) inside of the Patchwork repo, but please don't merge in depject modules from other packages. 

[patchcore](https://github.com/ssbc/patchcore) and [patch-settings](https://github.com/mixmix/patch-settings) are the only external packages that [merge in depject modules](https://github.com/ssbc/patchwork/blob/master/main-window.js#L23) (and that is because of legacy reasons). Please don't treat this as best practice.

I recommend doing as much as possible in the Patchwork repo rather than splitting into a bunch of modules. This makes it much easier to maintain and update the overall application. Only split things into modules that are clearly reusable components (algorithms, widgets, indexes) and use `require` to include them.

_Originally depject was included in Patchwork to ease plugin creation, but I have realised since that this was not the best approach. When used across packages, it tends to create confusing hard to maintain APIs._

**Please consider depject deprecated in Patchwork!** It will be replaced with something else in the near future, and I want to keep as much of it contained in the main patchwork repo to assist with migration. 