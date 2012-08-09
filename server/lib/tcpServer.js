/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var net = require('net')
    , path = require('path')
    , file = require('./file')
    , listeners = {}
    , browserSocket
    ;

  function assignSocket (socket) {
    browserSocket = socket;
  }

  function printErr(err, port) {
    console.error('TCP port', port, 'server error:', err);
  }

  function currentStatus() {
    var openPorts = Object.keys(listeners)
      ;

    openPorts = openPorts.sort();

    return openPorts.map(function (portNum) {
      return {
          portNum: portNum
        , connectionCount: listeners[portNum].connections.length
        , logSettings: listeners[portNum].logSettings
      };
    });
  }

  function createTcpListener(callback, port, logPath) {
    var server = net.createServer()
      , connections   = []
      , finishedData  = []
      , logSettings   = {}
      ;

    // wrap the callback so we never accidently call
    // the one we were given more than once
    function callbackWrapper(err) {
      callback(err, port);
      callback = printErr;
    }

    if (listeners.hasOwnProperty(port)) {
      callbackWrapper({message: "Already listening for TCP on port " + port});
      return;
    }

    function handleConnection(socket) {
      var socketData = ''
        ;

      connections.push(socket);
      if (connections.length !== server.connections) {
        callbackWrapper('connections list out of sync: expected', server.connections, 'found', connections.length);
      }
      browserSocket.emit('connectionChange', server.connections, false);

      socket.on('data', function (data) {
        socketData += data.toString();
      });

      socket.on('close', function () {
        var index = connections.indexOf(socket)
          ;

        if (index < 0) {
          callbackWrapper('got a close event for socket not in connections list');
        }
        else {
          connections.splice(index, 1);
        }
        if (connections.length !== server.connections) {
          callbackWrapper('connections list out of sync: expected', server.connections, 'found', connections.length);
        }

        browserSocket.send(socketData);
        browserSocket.emit('connectionChange', connections.length, true);
        if (logSettings.logData) {
          if (logSettings.separateFiles) {
            file.writeData(logSettings.logPath, socketData);
          }
          else {
            finishedData.push(socketData);
          }
        }
      });
    }

    server.on('error', callbackWrapper);
    server.on('connections', handleConnection);

    server.on('close', function () {
      if (finishedData.length > 0) {
        file.writeData(logSettings.logPath, finishedData.join('\r\n\r\n'));
        // fastest way to clear an array is to set length to 0
        finishedData.length = 0;
      }

      browserSocket.emit('closedConnection', port, 'tcp');
      delete listeners[port];
    });

    server.on('listening', function () {
      var error
        ;

      // make sure the port we report is actually the one we are listening on
      error = (port && port !== server.address().port) ? {message: "Listening port doesn't match specified port"} : null;
      port  = server.address().port;

      logSettings.logPath = path.resolve(logPath, 'tcp', port.toString());
      logSettings.logData = false;
      logSettings.separateFiles = false;

      // seal logSettings so nothing will be deleted or added (prevent stupid typos)
      Object.seal(logSettings);

      listeners[port] = {};
      listeners[port].server        = server;
      listeners[port].connections   = connections;
      listeners[port].finishedData  = finishedData;
      listeners[port].logSettings   = logSettings;

      // now freeze the listener so the references can't be changed or lost
      Object.freeze(listeners[port]);

      callbackWrapper(error);
    });

    server.listen(port);
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

    createTcpListener(serverCreated, request.params.portNum, logPath);
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
  function closeTcpListener(callback, port) {
    var timeoutId
      , error
      ;

    if (!listeners[port]) {
      callback({message: 'No TCP listener on specified port ' + port});
      return;
    }

    // give all of the connections 2 seconds to finish themselves before we destroy them
    timeoutId = setTimeout(function () {
      var connections = listeners[port].connections
        ;
      timeoutId = null;
      if (connections.length <= 0) {
        error = 'timeout not cleared even though no connections open';
        printErr(error, port);
        return;
      }

      error = 'forced to destroy remaining ' + connections.length + ' connection(s)';
      printErr(error, port);
      connections.forEach(function (socket) {
        socket.destroy();
      });
    }, 2000);

    listeners[port].server.close(function () {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      callback(error ? {message: error} : null);
    });
  }

  module.exports.assignSocket       = assignSocket;
  module.exports.currentStatus      = currentStatus;
  module.exports.startListening     = startListening;
  module.exports.changeLogSettings  = changeLogSettings;
  module.exports.closeListener      = closeTcpListener;

}());
