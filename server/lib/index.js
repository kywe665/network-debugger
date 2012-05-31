/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var connect = require('steve')
    , app = connect.createServer()
    , net = require('net')
    , util = require('util')
    , dgram = require('dgram')
    , listener
    , currentTcpPort
    , currentHttpPort
    , currentUdpPort
    , tcpBuffer = ''
    , httpBuffer = ''
    , udpBuffer = ''
    , browserSocket
    , Socket = require('socket.io')
    , io = Socket.listen(3454)
    , socketMap = {}
    , openedConnections = 0
    , closedConnections = 0
    , connectObj
    , serverHttp
    , serverUdp
    , tcpMsg = {}
    , fs = require('fs.extra')
    , path = require('path')
    , isLoggingTcp = false
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
      startListening(request, response);
    }
    
    //Browser Comm Sockets
    function openSockets() {
      io.sockets.on('connection', function (socket) {
        console.log('CoNneCtEd socket');
        browserSocket = socket;      
        socket.on('message', function (data) {
          console.log(data);
        });
        socket.on('disconnect', function () { 
          console.log('DiScOnNected socket');
          /*if(listener){
            closeAllSockets();
          }
          if(serverUdp){
            serverUdp.close();
          }
          if(serverHttp){
            serverHttp.close();
          }*/
        });
        socket.on('allDone', function () {
          console.log('all done');
          closeAllSockets();
        });
        socket.on('killHttp', function () {
          console.log('killHttp');
          serverHttp.close();
        });
        socket.on('killUdp', function () {
          console.log('killUdp');
          serverUdp.close();
        });
        socket.on('writeFile', function (protocol) { 
          console.log(protocol);
          if (protocol === 'tcp'){
            writeFile(protocol, tcpBuffer, currentTcpPort, function(){tcpBuffer = '';});
          }
          else if (protocol === 'http'){
            writeFile(protocol, httpBuffer, currentHttpPort, function(){httpBuffer = '';});
          }
          else if (protocol === 'udp'){
            writeFile(protocol, udpBuffer, currentUdpPort, function(){udpBuffer = '';});
          }
        });
        socket.on('close', function () { 
          console.log('ClOsEd Socket');
        });
        socket.on('includeHeaders', function (bool) { 
          includeHeaders = bool;
        });
        socket.on('logTcp', function() {
          if(!isLoggingTcp){
            isLoggingTcp = true;
            console.log('logging tcp Start');
            mkdir('tcp', currentTcpPort);
          }
          else{
            isLoggingTcp = false;
            if(tcpBuffer){
              //write the file
              writeFile('tcp', tcpBuffer, currentTcpPort, function(){
                tcpBuffer = '';
                console.log('tcp Saved!');
              });
            }
          }
        });
        socket.on('logHttp', function() {
          if(!isLoggingHttp){
            isLoggingHttp = true;
            console.log('logging Http Start');
            mkdir('http', currentHttpPort);
          }
          else{
            isLoggingHttp = false;
            if(httpBuffer){
              //write the file
              writeFile('http', httpBuffer, currentHttpPort, function(){
                httpBuffer = '';
                console.log('http Saved!');
              });
            }
          }
        });
        socket.on('logUdp', function() {
          if(!isLoggingUdp){
            isLoggingUdp = true;
            console.log('logging Udp Start');
            mkdir('udp', currentUdpPort);
          }
          else{
            isLoggingUdp = false;
            if(udpBuffer){
              //write the file
              writeFile('udp', udpBuffer, currentUdpPort, function(){
                udpBuffer = '';
                console.log('UDP Saved!');
              });
            }
          }
        });
      });
    }
    
    function writeFile(protocol, buffer, port, callback) {
      var date = new Date()
        , filename
        ;
      filename = date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()+'_'+(date.getMonth()+1)+'-'+date.getDate()+'-'+date.getFullYear();
      fs.writeFile(path.join(logpath, protocol, port, filename+'.txt'), buffer
      , function (err) {
          if (err) throw err;
          callback();
        })
      ;
    }
    
    //Make directory for logger
    function mkdir(protocol, port) {
      fs.mkdirp(path.join(logpath, protocol, port));
    } 

    //Open Sockets to listen on network TCP
    function startListening (request, response) {
      var success = {}
        , date
        , filename
        ;
      success.socket = true;
      console.log('starting connection');
      listener = net.createServer(function(listenSocket) { //'connection' listener      
        //When a new socket is opened assign it a uid and map it.
        listenSocket.id = openedConnections;
        socketMap[openedConnections] = listenSocket;
        //set the message to empty string so null value is not coaxed to string
        tcpMsg[listenSocket.id] = '';
        openedConnections++;
        browserSocket.emit('connectionChange', openedConnections-closedConnections, false);
        //Event not quite sure
        listenSocket.on('end', function() {
          console.log('server end');
        });
        //Event when Socket is closed
        listenSocket.on('close', function() {
          console.log('server close');
          closedConnections++;
          console.log('destroyed socket '+ listenSocket.id);
          browserSocket.send(tcpMsg[listenSocket.id]);
          browserSocket.emit('connectionChange', openedConnections-closedConnections, true);
          delete socketMap[listenSocket.id];
          delete tcpMsg[listenSocket.id];
        });
        //Event when data is transferred
        listenSocket.on('data', function(data) {
          tcpMsg[listenSocket.id] += (data.toString());
          if(isLoggingTcp){
            tcpBuffer += (data.toString() + '\r\n\r\n');
            browserSocket.emit('seperateFiles', 'tcp');
          }
        });
      });
      //bind the server to listen to the requested port
      listener.listen(request.params.portNum, function() { //'listening' listener
        console.log('server bound to '+ request.params.portNum);
        currentTcpPort = request.params.portNum;
        success.listening = true;
        response.json(success);
        response.end();
      });
      //If address in use, try again
      listener.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
          console.log('Address in use, retrying...');
          setTimeout(function () {
            listener.close();
            listener.listen(request.params.portNum, function() { //'listening' listener
              console.log('server re-bound to '+ request.params.portNum);
              success.listening = true;
              response.json(success);
              response.end();
            });
          }, 1000);
        }
        else console.log('other error ',e);
      });
    }

    //When user requests to close the connection
    function closeAllSockets() {
      Object.keys(socketMap).forEach(function(socket){
        socketMap[socket].destroy();
      });
      listener.close();
      browserSocket.emit('closedConnection', currentTcpPort, 'tcp');
    }

    function router(rest) {
      rest.get('/listenTCP/:portNum', listenTcp);
      rest.get('/listenHTTP/:portNum', listenHttp);
      rest.get('/listenUDP/:portNum', listenUdp);
    }

    app.use(connect.favicon());
    app.use(connect.static(__dirname + '/../../webclient-deployed'));
    app.use(connect.router(router));
    
    return app;
  }
    module.exports = create;
}());

