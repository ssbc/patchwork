// Multi Language support
var appRoot = require('app-root-path');

var i18n = require("i18n")
i18n.configure({
    locales:['en','ki'],
    directory: appRoot + '/locales'
});

i18n.setLocale('ki')

exports.i18n = i18n;
