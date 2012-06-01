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
    , file = require('./file')
    , util = require('util')
    , browserSocket
    , Socket = require('socket.io')
    , io = Socket.listen(3454)
    ;

  connect.router = require('connect_router');

  io.set('log level', 1);

  function create (logpath) {
    //function when a GET request is sent to /listenUDP
    function listenUdp(request, response) {
      openSockets();
      udpServer.startListening(request, response);
    }

    //function when a GET request is sent to /listenHTTP
    function listenHttp(request, response) {
      console.log(request.params.portNum);
      openSockets();
      httpServer.startListening(request, response);
    }

    //function when a GET request is sent to /listenTCP
    function listenTcp(request, response) {
      console.log('opening sockets');
      openSockets();
      tcpServer.startListening(request, response);
    }
    
    //Browser Comm Sockets
    function openSockets() {
      io.sockets.on('connection', function (socket) {
        console.log('CoNneCtEd socket');
        browserSocket = socket;
        udpServer.assignSocket(socket);
        tcpServer.assignSocket(socket);
        httpServer.assignSocket(socket);
        socket.on('message', function (data) {
          console.log('message: ' + data);
        });
        socket.on('disconnect', function () { 
          console.log('DiScOnNected socket');
        });
        socket.on('killtcp', function () {
          console.log('all done');
          tcpServer.closeAllSockets();
        });
        socket.on('killhttp', function () {
          console.log('killHttp');
          httpServer.close();
        });
        socket.on('killudp', function () {
          console.log('killUdp');
          udpServer.close();
        });
        socket.on('writeFile', function (protocol) { 
          console.log(protocol);
          if (protocol === 'tcp'){
            tcpServer.writeFile(logpath);
          }
          else if (protocol === 'http'){
            httpServer.writeFile(logpath);
          }
          else if (protocol === 'udp'){
            udpServer.writeFile(logpath);
          }
        });
        socket.on('close', function () { 
          console.log('ClOsEd Socket');
        });
        socket.on('includeHeaders', function (bool) { 
          httpServer.headers(bool);
        });
        socket.on('logtcp', function() {
          tcpServer.toggleLog(logpath);
        });
        socket.on('loghttp', function() {
          httpServer.toggleLog(logpath);
        });
        socket.on('logudp', function() {
          udpServer.toggleLog(logpath);
        });
      });
    } 

    function router(rest) {
      rest.get('/listentcp/:portNum', listenTcp);
      rest.get('/listenhttp/:portNum', listenHttp);
      rest.get('/listenudp/:portNum', listenUdp);
    }

    app.use(connect.favicon());
    app.use(connect.static(__dirname + '/../../webclient-deployed'));
    app.use(connect.router(router));
    
    return app;
  }
    module.exports.create = create;
}());

