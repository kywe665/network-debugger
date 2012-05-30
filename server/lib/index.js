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
    , connectHttp = require('connect')
    , connectObj
    , serverHttp
    , serverUdp
    , tcpMsg = {}
    , fs = require('fs')
    , isLoggingTcp = false
    , isLoggingHttp = false
    , isLoggingUdp = false
    ;

  connect.router = require('connect_router');

  //function when a GET request is sent to /listenUDP
  function listenUdp(request, response) {
    openSockets();
    serverUdp = dgram.createSocket('udp4');
    serverUdp.on("message", function (msg, rinfo) {
      var message = msg.toString('utf8'); //+ rinfo.address + ":" + rinfo.port;
      if(isLoggingUdp){
        udpBuffer += message + '\r\n\r\n';
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
    var connectObj = connect()
      //.use(connectHttp.bodyParser())
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
      httpBuffer += (data + req.rawBody + '\r\n\r\n');
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
      socket.on('close', function () { 
        console.log('ClOsEd Socket');
      });
      socket.on('testSocket', function() {
        socket.send('Yes, I\'m still here');
      });
      socket.on('logTcp', function() {
        if(!isLoggingTcp){
          isLoggingTcp = true;
          console.log('logging tcp Start');
          mkdir('TCP', currentTcpPort);
        }
        else{
          isLoggingTcp = false;
          if(tcpBuffer){
            //write the file
            writeFile('TCP', tcpBuffer, currentTcpPort, function(){
              tcpBuffer = '';
              console.log('TCP Saved!');
            });
          }
        }
      });
      socket.on('logHttp', function() {
        if(!isLoggingHttp){
          isLoggingHttp = true;
          console.log('logging Http Start');
          mkdir('HTTP', currentHttpPort);
        }
        else{
          isLoggingHttp = false;
          if(httpBuffer){
            //write the file
            writeFile('HTTP', httpBuffer, currentHttpPort, function(){
              tcpBuffer = '';
              console.log('HTTP Saved!');
            });
          }
        }
      });
      socket.on('logUdp', function() {
        if(!isLoggingUdp){
          isLoggingUdp = true;
          console.log('logging Udp Start');
          mkdir('UDP', currentUdpPort);
        }
        else{
          isLoggingUdp = false;
          if(udpBuffer){
            //write the file
            writeFile('UDP', udpBuffer, currentUdpPort, function(){
              tcpBuffer = '';
              console.log('UDP Saved!');
            });
          }
        }
      });
    });
  }
  
  function writeFile(type, buffer, port, callback) {
    var date = new Date()
      , filename
      ;
    filename = date.getHours()+'-'+date.getMinutes()+'_'+(date.getMonth()+1)+'-'+date.getDate()+'-'+date.getFullYear();
    fs.writeFile('./Log-Files/'+type+'/'+port+'/'+filename+'.txt', buffer
    , function (err) {
        if (err) throw err;
        callback();
      })
    ;
  }
  
  //Make directory for logger
  function mkdir(type, port) {
    fs.mkdir('Log-Files', function (err, data) {
      if (err){
        if(err.code === 'EEXIST'){
          console.log('dir Log-Files exists');
        }
        else throw err;
      }
      fs.mkdir('./Log-Files/'+type, function (err, data) {
        if (err){
          if(err.code === 'EEXIST'){
            console.log('dir '+type+' exists');
          }
          else throw err;
        }
        fs.mkdir('./Log-Files/'+type+'/'+port, function (err, data) {
          if (err){
            if(err.code === 'EEXIST'){
              console.log('dir '+port+' exists');
            }
            else throw err;
          }
        });
      });
    });
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

  module.exports = app;

}());

