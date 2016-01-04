var fs = require('fs')
module.exports = function (conf) {
  // ask the oracle thy question
  var oracle = {
    allowRemoteAccess: function () {
      return conf.allowRemoteAccess
    },
    
    requiresPassword: function () {
      return isString(conf.singleUserPassword)
    },
    checkPassword: function (str) {
      return str === conf.singleUserPassword
    },

    useTLS: function () {
      return !!conf.tls
    },
    validateTLS: function () {
      if (!isObject(conf.tls)) {
        console.log('ERROR! tls config requires tls.key (path to the keyfile) and tls.cert (path to the certfile)')
        return false
      }
      if (!isString(conf.tls.key)) {
        console.log('ERROR! tls.key, a path to your TLS key, is required for TLS to work.')
        return false
      }
      if (!isString(conf.tls.cert)) {
        console.log('ERROR! tls.cert, a path to your TLS cert, is required for TLS to work.')
        return false
      }
      try {
        var keyStat = fs.statSync(conf.tls.key)
        if (!keyStat.isFile())
          throw "err"
      } catch (e) {
        console.log('ERROR! the file specified by the tls.key path was not valid.')
        return false
      }
      try {
        var certStat = fs.statSync(conf.tls.cert)
        if (!certStat.isFile())
          throw "err"
      } catch (e) {
        console.log('ERROR! the file specified by the tls.cert path was not valid.')
        return false
      }
      return true
    },
    getTLS: function () {
      return {
        key: fs.readFileSync(conf.tls.key),
        cert: fs.readFileSync(conf.tls.cert)
      }
    },

    // function to validate the config choices made
    hasError: function () {
      // error: allowing remote access but without a TLS cert
      if (this.allowRemoteAccess() && !this.useTLS())
        return true
      // error: bad TLS config
      if (this.useTLS() && !this.validateTLS())
        return true
    },
    allowUnsafe: function () {
      return conf.unsafe
    }
  }

  // give the user some feedback about the config state

  // password config
  if (oracle.requiresPassword())
    console.log('[CFG] Password: YES.')
  else
    console.log('[CFG] Password: NO.')

  // TLS
  if (oracle.useTLS())
    console.log('[CFG] TLS: YES.')
  else
    console.log('[CFG] TLS: NO.')

  // allowRemoteAccess variations
  if (oracle.allowRemoteAccess()) {
    console.log('[CFG] Remote Access: YES.')
    if (!oracle.requiresPassword())
      console.log('WARNING! Remote access is allowed, but no password is configured. This is not safe!')
    if (!oracle.useTLS())
      console.log('ERROR! Remote access is allowed, but no TLS security is configured. Other devices will be able to steal the password or inject attacks.')
  } else
    console.log('[CFG] Remote Access: NO.')

  return oracle
}

function isString (v) {
  return v && typeof v == 'string'
}
function isObject (v) {
  return v && typeof v == 'object'
}