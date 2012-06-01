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
    , dgram = require('dgram')
    , currentHttpPort
    , currentUdpPort
    , httpBuffer = ''
    , udpBuffer = ''
    , browserSocket
    , Socket = require('socket.io')
    , io = Socket.listen(3454)
    , connectObj
    , serverHttp
    , serverUdp
    , isLoggingHttp = false
    , isLoggingUdp = false
    , includeHeaders = true
    ;

  connect.router = require('connect_router');

  function create (logpath) {
    //function when a GET request is sent to /listenUDP
    function listenUdp(request, response) {
      openSockets();
      serverUdp = dgram.createSocket('udp4');
      serverUdp.on("message", function (msg, rinfo) {
        var message = msg.toString('utf8'); //+ rinfo.address + ":" + rinfo.port;
        if(isLoggingUdp){
          udpBuffer += message + '\r\n\r\n';
          browserSocket.emit('seperateFiles', 'udp');
        }
        browserSocket.emit('udpData', {"body": message});
      });
      serverUdp.on("listening", function () {
        var address = serverUdp.address();
        console.log("server listening " +
            address.address + ":" + address.port);
      });
      serverUdp.on("close", function () {
        console.log("UDP CLOSED: ");
        browserSocket.emit('closedConnection', request.params.portNum, 'udp');
      });
      serverUdp.on("error", function (e) {
        console.log("UDP error: " + e);
      });
      serverUdp.bind(request.params.portNum);
      currentUdpPort = request.params.portNum;
      response.end();
    }

    //function when a GET request is sent to /listenHTTP
    function listenHttp(request, response) {
      console.log(request.params.portNum);
      var connectObj = connect.createServer()
        .use(getBody)
        .use(readHttp);
      serverHttp = connectObj.listen(request.params.portNum);
      currentHttpPort = request.params.portNum;
      serverHttp.on('close', function() {
        console.log('HTTP server closed');
        browserSocket.emit('closedConnection', request.params.portNum, 'http');
      });
      openSockets();
      response.end();
    }

    function getBody(req, res, next) {
      var data = ''
        ;
      req.on('data', function (chunk) {
        data += chunk.toString('utf8');
      });
      req.on('end', function() {
        req.rawBody = data;
        next();
      });
    }

    function readHttp (req, res){
      var data = ''
        ;
      data += req.method.toUpperCase() + ' ' + req.url + ' ' + 'HTTP/' + req.httpVersion + '\r\n';
      Object.keys(req.headers).forEach(function (key) {
        data += key + ': ' + req.headers[key] + '\r\n';
      });
      data += '\r\n';

      browserSocket.emit('httpData', {
          "headers": data
        , "body": req.rawBody
        , "protocol": 'http'
      });
      if(isLoggingHttp){
        if(includeHeaders) {
          httpBuffer += (data + req.rawBody + '\r\n\r\n');
        }
        else{
          httpBuffer += (req.rawBody + '\r\n\r\n');
        }
        browserSocket.emit('seperateFiles', 'http');
      }
      res.end('Hello from Connect!\n');
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
        tcpServer.assignSocket(socket);
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
          serverHttp.close();
        });
        socket.on('killudp', function () {
          console.log('killUdp');
          serverUdp.close();
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
          includeHeaders = bool;
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

