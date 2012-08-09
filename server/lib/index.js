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

    websocketServer = socket.listen(3454);
    websocketServer.set('log level', 1);
    websocketServer.sockets.on('connection', function (socket) {
      connectedSockets.push(socket);

      socket.on('disconnect', function () {
        var index = connectedSockets.indexOf(socket)
          ;
        if (index >= 0) {
          connectedSockets.splice(index, 1);
          console.log('Browser socket disconnected');
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
          console.log('Browser socket closed');
        }
        else {
          console.error('Received close event from unlisted browser socket');
        }
      });
    });

    function onPageLoad(request, response){
      var summary = {}
        ;

      Object.keys(listenerControl).forEach(function (protocol) {
        summary[protocol] = listenerControl[protocol].currentStatus();
      });

      response.json(summary);
    }

    function startListening(request, response) {
      var manager = listenerControl[request.params.protocol]
        ;

      if (!manager) {
        response.error('Unsupported protocol ' + request.params.protocol);
        return response.json();
      }

      function listenerCreated(error, port) {
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

      manager.createListener(listenerCreated, request.params.portNum, logPath);
    }

    function router(rest) {
      rest.get('/onPageLoad', onPageLoad);
      rest.post('/listeners/:protocol/:portNum', startListening);
    }

    app = connect.createServer();
    app.use(connect.favicon());
    app.use(connect['static'](__dirname + '/../../webclient-deployed'));
    app.use(connect.router(router));

    return app;
  }

  module.exports.init = init;
}());

