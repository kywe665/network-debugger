/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var connect = require('steve')
    , app = connect()
    , net = require('net')
    , util = require('util')
    , listener
    , browserSocket
    , currentPort
    , Socket = require('socket.io')
    , io = Socket.listen(3454)
    , socketMap = {}
    , openedConnections = 0
    , closedConnections = 0

    , connectHttp = require('connect')
    , connectObj
    , serverHttp
    ;

  connect.router = require('connect_router');

  //function when a GET request is sent to /listenHTTP
  function listenHttp(request, response) {
    console.log(request.params.portNum);
    var connectObj = connect()
      .use(connectHttp.bodyParser())
      .use(readHttp);
    serverHttp = connectObj.listen(request.params.portNum);
    serverHttp.on('close', function() {
      console.log('HTTP server closed');
      browserSocket.emit('closedConnection', request.params.portNum);
    });
    openSockets();
    response.end();
  }
  function readHttp (req, res){
    var data;
    data = 'Method: '+ req.method;
    data += '<br/>Headers: '+ JSON.stringify(req.headers);
    data += '<br/>Body: '+ JSON.stringify(req.body);
    data += '<br/>URL: '+ req.url;
    browserSocket.send(data);
    //browserSocket.send(JSON.stringify(req));
    res.end('Hello from Connect!\n');
  }

  //function when a GET request is sent to /listenTCP
  function listenTcp(request, response) {
    console.log('opening sockets');
    openSockets();
    startListening(request, response);
  }
  
  function openSockets() {
    io.sockets.on('connection', function (socket) {
      console.log('CoNneCtEd socket');
      browserSocket = socket;      
      socket.on('message', function (data) {
        console.log(data);
        socket.send('you said: '+data+', I say: hello');
      });
      socket.on('disconnect', function () { 
        console.log('DiScOnNected socket');
      });
      socket.on('allDone', function () {
        console.log('all done');
        closeAllSockets();
      });
      socket.on('killHttp', function () {
        console.log('killHttp');
        serverHttp.close();
      });
      socket.on('close', function () { 
        console.log('ClOsEd Socket');
      });
      socket.on('testSocket', function() {
        socket.send('Yes, I\'m still here');
      });
    });
  }

  //Open Sockets to listen on network
  function startListening (request, response) {
    var success = {};
    success.socket = true;
    console.log('starting connection');
    listener = net.createServer(function(listenSocket) { //'connection' listener      
      //When a new socket is opened assign it a uid and map it.
      listenSocket.id = openedConnections;
      socketMap[openedConnections] = listenSocket;
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
        browserSocket.emit('connectionChange', openedConnections-closedConnections, true);
        delete socketMap[listenSocket.id];
      });
      //Event when data is transferred
      listenSocket.on('data', function(data) {
        console.log(data.toString());
        browserSocket.send('Netcat: '+data.toString());
      });
    });
    //bind the server to listen to the requested port
    listener.listen(request.params.portNum, function() { //'listening' listener
      console.log('server bound to '+ request.params.portNum);
      currentPort = request.params.portNum;
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
    browserSocket.emit('closedConnection', currentPort);
  }

  function router(rest) {
    rest.get('/listenTCP/:portNum', listenTcp);
    rest.get('/listenHTTP/:portNum', listenHttp);
  }

  app.use(connect.favicon());
  app.use(connect.static(__dirname + '/../../webclient-deployed'));
  app.use(connect.router(router));

  module.exports = app;

}());
