/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var dgram = require('dgram')
    , path = require('path')
    , file = require('./file')
    , browserSocket
    , listeners = {}
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
          portNum: portNum
        , logSettings: listeners[portNum].logSettings
      };
    });
  }

  function createUdpListener(callback, port, logPath) {
    var server = dgram.createSocket('udp4')
      , finishedData  = []
      , logSettings   = {}
      ;

    function callbackWrapper(err) {
      callback(err, port);
      callback = printErr;
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
      error = (port && port !== server.address().port) ? {message: "Listening port doesn't match specified port"} : null;
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

  //Open Sockets to listen on network TCP
  function startListening (request, response, logPath) {
    function serverCreated(error, port) {
      var success = {}
        ;

      if (error) {
        response.error(error);
        response.json();
        return;
      }

      success.socket = true;
      success.listening = port;
      response.json(success);
    }

    createUdpListener(serverCreated, request.params.portNum, logPath);
  }

  // Change whether or not we should log, and it we should log packets separately
  function changeLogSettings(port, logData, separateFiles) {
    var listener = listeners[port]
      ;

    if (logData) {
      file.mkdir(listener.logSettings.logPath);
    }
    if (listener.finishedData.length > 0 && (!logData || separateFiles)) {
      file.writeData(listener.logSettings.logPath, listener.finishedData.join('\r\n\r\n'));
      // fastest way to clear an array is to set length to 0
      listener.finishedData.length = 0;
    }

    listener.logSettings.logData       = logData;
    listener.logSettings.separateFiles = separateFiles;
  }

  //When user requests to close the connection
  function closeUdpListener(callback, port) {
    if (!listeners[port]) {
      callback({message: 'No listener on specified port ' + port});
      return;
    }

    listeners[port].server.close(callback);
  }


  module.exports.assignSocket       = assignSocket;
  module.exports.currentStatus      = currentStatus;
  module.exports.startListening     = startListening;
  module.exports.changeLogSettings  = changeLogSettings;
  module.exports.closeListener      = closeUdpListener;

}());
