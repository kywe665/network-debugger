/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var dgram = require('dgram')
    , path = require('path')
    , file = require('./file')
    , listeners = {}
    , browserSocket
    ;

  function assignSocket (socket) {
    browserSocket = socket;
  }

  function printErr(err, port) {
    console.error('UDP port', port, 'server error:', err);
  }

  function currentStatus() {
    var openPorts = Object.keys(listeners)
      ;

    openPorts = openPorts.sort();

    return openPorts.map(function (portNum) {
      return {
          portNum: Number(portNum)
        , logSettings: listeners[portNum].logSettings
      };
    });
  }

  function createUdpListener(callback, port, logPath) {
    var server = dgram.createSocket('udp4')
      , finishedData  = []
      , logSettings   = {}
      ;

    // wrap the callback so we never accidently call
    // the one we were given more than once
    function callbackWrapper(err) {
      callback(err, port);
      callback = printErr;
    }

    if (isNaN(port)) {
      callbackWrapper('Specified port must be a number');
      return;
    }

    port = Number(port);
    if (listeners.hasOwnProperty(port)) {
      callbackWrapper('Already listening for UDP on port ' + port);
      return;
    }

    server.on('error', callbackWrapper);

    server.on('message', function (msg, rinfo) {
      var message = msg.toString('utf8')
        ;

      browserSocket.emit('udpData', {protocol: 'udp', port: port, body: message});
      if (logSettings.logData) {
        if (logSettings.separateFiles) {
          file.writeData(logSettings.logPath, message);
        }
        else {
          finishedData.push(message);
        }
      }
    });

    server.on("close", function () {
      if (finishedData.length > 0) {
        file.writeData(logSettings.logPath, finishedData.join('\r\n\r\n'));
        // fastest way to clear an array is to set length to 0
        finishedData.length = 0;
      }

      browserSocket.emit('closedConnection', port, 'udp');
      delete listeners[port];
    });

    server.on('listening', function () {
      var error
        ;

      // make sure the port we report is actually the one we are listening on
      error = (port && port !== server.address().port) ? "Listening port doesn't match specified port" : null;
      port  = server.address().port;

      logSettings.logPath = path.resolve(logPath, 'udp', port.toString());
      logSettings.logData = false;
      logSettings.separateFiles = false;

      // seal logSettings so nothing will be deleted or added (prevent stupid typos)
      Object.seal(logSettings);

      listeners[port] = {};
      listeners[port].server        = server;
      listeners[port].finishedData  = finishedData;
      listeners[port].logSettings   = logSettings;

      // now freeze the listener so the references can't be changed or lost
      Object.freeze(listeners[port]);

      callbackWrapper(error);
    });

    server.bind(port);
  }

  // Change whether or not we should log, and it we should log packets separately
  function changeLogSettings(port, newSettings) {
    var logSettings = listeners[port].logSettings
      , finishedData = listeners[port].finishedData
      , unusedKeys = []
      ;

    Object.keys(newSettings).forEach(function (key) {
      if (logSettings.hasOwnProperty(key) && key !== 'logPath') {
        logSettings[key] = newSettings[key];
      }
      else {
        unusedKeys.push(key);
      }
    });

    if (logSettings.logData) {
      file.mkdir(logSettings.logPath);
    }
    if (finishedData.length > 0 && (!logSettings.logData || logSettings.separateFiles)) {
      file.writeData(logSettings.logPath, finishedData.join('\r\n\r\n'));
      // fastest way to clear an array is to set length to 0
      finishedData.length = 0;
    }

    return {
        logSettings: logSettings
      , unusedKeys: unusedKeys
    };
  }

  //When user requests to close the connection
  function closeUdpListener(callback, port) {
    if (!listeners[port]) {
      callback({message: 'No UDP listener on specified port ' + port});
      return;
    }

    listeners[port].server.close(callback);
  }

  module.exports.assignSocket       = assignSocket;
  module.exports.currentStatus      = currentStatus;
  module.exports.createListener     = createUdpListener;
  module.exports.changeLogSettings  = changeLogSettings;
  module.exports.closeListener      = closeUdpListener;

}());
