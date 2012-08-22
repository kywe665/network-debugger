/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var connect = require('steve')
    , socket = require('socket.io')
    , listenerControl = {
          http: require('./httpServer')
        , tcp:  require('./tcpServer')
        , udp:  require('./udpServer')
      }
    , initialized = false
    ;

  connect.router = require('connect_router');

  function init(logPath) {
    var app
      , centralEmitter = {}
      , websocketServer
      , connectedSockets = []
      ;

    if (initialized) {
      throw new Error('Tried to call init more than once');
    }
    initialized = true;

    centralEmitter.emit = function () {
      var args = arguments
        ;

      connectedSockets.forEach(function (socket) {
        socket.emit.apply(socket, args);
      });
    };
    centralEmitter.send = function () {
      var args = arguments
        ;

      connectedSockets.forEach(function (socket) {
        socket.send.apply(socket, args);
      });
    };
    Object.keys(listenerControl).forEach(function (protocol) {
      listenerControl[protocol].assignSocket(centralEmitter);
    });

    websocketServer = socket.listen(0);
    websocketServer.set('log level', 1);
    websocketServer.sockets.on('connection', function (socket) {
      connectedSockets.push(socket);

      console.log('Browser socket connected (count = ' + connectedSockets.length + ')');
      socket.on('disconnect', function () {
        var index = connectedSockets.indexOf(socket)
          ;
        if (index >= 0) {
          connectedSockets.splice(index, 1);
          console.log('Browser socket disconnected (count = ' + connectedSockets.length + ')');
        }
        else {
          console.error('Received disconnect event from unlisted browser socket');
        }
      });
      socket.on('close', function () {
        var index = connectedSockets.indexOf(socket)
          ;
        if (index >= 0) {
          connectedSockets.splice(index, 1);
          console.log('Browser socket closed (count = ' + connectedSockets.length + ')');
        }
        else {
          console.error('Received close event from unlisted browser socket');
        }
      });
    });

    function onPageLoad(request, response){
      var summary = {}
        ;

      summary.socketPort = websocketServer.server.address().port;

      Object.keys(listenerControl).forEach(function (protocol) {
        summary[protocol] = listenerControl[protocol].currentStatus();
      });

      response.json(summary);
    }

    function getListeners(request, response) {
      var manager = listenerControl[request.params.protocol]
        , openPorts
        , foundSpecified
        ;

      if (!manager) {
        response.error('Unsupported protocol ' + request.params.protocol);
        response.json();
        return;
      }
      openPorts = manager.currentStatus();

      if (!request.params.hasOwnProperty('portNum')) {
        response.json(openPorts);
        return;
      }
      if (isNaN(request.params.portNum)) {
        response.error('Specified port must be a number');
        response.json();
        return;
      }

      request.params.portNum = Number(request.params.portNum);
      foundSpecified = openPorts.some(function (listener) {
        if (listener.portNum === request.params.portNum) {
          response.json(listener);
          return true;
        }
      });

      if (!foundSpecified) {
        response.error('Not listening for ' + request.params.protocol + ' on port ' + request.params.portNum);
        response.json();
      }
    }

    function startListening(request, response) {
      var manager = listenerControl[request.params.protocol]
        ;

      if (!manager) {
        response.error('Unsupported protocol ' + request.params.protocol);
        return response.json();
      }
      if (isNaN(request.params.portNum)) {
        response.error('Specified port must be a number');
        response.json();
        return;
      }

      function listenerCreated(error, port) {
        if (error) {
          response.error(error);
          response.json();
          return;
        }

        request.params.portNum = port;
        getListeners(request, response);
      }

      manager.createListener(listenerCreated, request.params.portNum, logPath);
    }

    function changeSettings(request, response) {
      var manager = listenerControl[request.params.protocol]
        , retVal
        ;

      if (!manager) {
        response.error('Unsupported protocol ' + request.params.protocol);
        return response.json();
      }
      if (isNaN(request.params.portNum)) {
        response.error('Specified port must be a number');
        response.json();
        return;
      }
      if (!request.body || 'object' !== typeof request.body) {
        console.error('Cannot set log settings for', request.params.protocol+':'+request.params.portNum, 'with', request.body);
        response.error('Must send a JSON object in the body');
        response.json();
        return;
      }

      retVal = manager.changeLogSettings(request.params.portNum, request.body);
      response.json(retVal);
    }

    function stopListening(request, response) {
      var manager = listenerControl[request.params.protocol]
        ;

      if (!manager) {
        response.error('Unsupported protocol ' + request.params.protocol);
        return response.json();
      }
      if (isNaN(request.params.portNum)) {
        response.error('Specified port must be a number');
        response.json();
        return;
      }

      function listenerDestroyed(error) {
        if (error) {
          response.error(error);
        }
        response.json();
      }

      manager.closeListener(listenerDestroyed, request.params.portNum);
    }

    function router(rest) {
      rest.get('/onPageLoad', onPageLoad);
      rest.get('/listeners/:protocol', getListeners);
      rest.get('/listeners/:protocol/:portNum', getListeners);
      rest.post('/listeners/:protocol/:portNum', startListening);
      rest.put('/listeners/:protocol/:portNum', changeSettings);
      rest.del('/listeners/:protocol/:portNum', stopListening);
    }

    app = connect.createServer();
    app.use(connect.json());
    app.use(connect.urlencoded());
    app.use(connect.favicon());
    app.use(connect['static'](__dirname + '/../../webclient-deployed'));
    app.use(connect.router(router));

    return app;
  }

  module.exports.init = init;
}());

