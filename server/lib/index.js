/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var connect = require('steve')
    , app = connect.createServer()
    , tcpServer = require('./tcpServer')
    , httpServer = require('./httpServer')
    , udpServer = require('./udpServer')
    , browserSocket
    , Socket = require('socket.io')
    , io = Socket.listen(3454)
    ;

  connect.router = require('connect_router');

  io.set('log level', 1);

  function create (logpath) {
    openSockets();
    //function when a GET request is sent to /listenUDP
    function listenUdp(request, response) {
      udpServer.startListening(request, response, logpath);
    }

    //function when a GET request is sent to /listenHTTP
    function listenHttp(request, response) {
      httpServer.startListening(request, response);
    }

    //function when a GET request is sent to /listenTCP
    function listenTcp(request, response) {
      tcpServer.startListening(request, response, logpath);
    }

    function onPageLoad(request, response){
      response.json({
        "http": httpServer.currentStatus()
      , "tcp": tcpServer.currentStatus()
      , "udp": udpServer.currentStatus()
      });
      response.end();
    }

    //Browser Comm Sockets
    function openSockets() {
      io.sockets.on('connection', function (socket) {
        browserSocket = socket;
        console.log('Connected to browser');
        udpServer.assignSocket(socket);
        tcpServer.assignSocket(socket);
        httpServer.assignSocket(socket);
        socket.on('message', function (data) {
        });
        socket.on('disconnect', function () {
          console.log('Browser disconnected');
        });
        socket.on('killtcp', function (port) {
          tcpServer.closeListener(function () {}, port);
        });
        socket.on('killhttp', function (port) {
          httpServer.close(port);
        });
        socket.on('killudp', function (port) {
          udpServer.closeListener(function () {}, port);
        });
        socket.on('writeFile', function (protocol, port, id) {
          if (protocol === 'http'){
            httpServer.writeFile(logpath, port);
          }
        });
        socket.on('close', function () {
          console.log('ClOsEd Socket');
        });
        socket.on('includeHeaders', function (bool) {
          httpServer.headers(bool);
        });
        socket.on('logtcp', function(port, logData, separateFiles) {
          tcpServer.changeLogSettings(port, logData, separateFiles);
        });
        socket.on('loghttp', function(port) {
          httpServer.toggleLog(logpath, port);
        });
        socket.on('logudp', function(port, logData, separateFiles) {
          udpServer.changeLogSettings(port, logData, separateFiles);
        });
      });
    }

    function router(rest) {
      rest.post('/listentcp/:portNum', listenTcp);
      rest.post('/listenhttp/:portNum', listenHttp);
      rest.post('/listenudp/:portNum', listenUdp);
      rest.get('/onPageLoad', onPageLoad);
    }

    app.use(connect.favicon());
    app.use(connect.static(__dirname + '/../../webclient-deployed'));
    app.use(connect.router(router));

    return app;
  }

  module.exports.create = create;
}());

