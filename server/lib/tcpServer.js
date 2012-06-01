/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var net = require('net')
    , listener
    , socketMap = {}
    , openedConnections = 0
    , closedConnections = 0
    , tcpMsg = {}
    , browserSocket
    , file = require('./file')
    , isLoggingTcp = false
    , tcpBuffer = ''
    , currentTcpPort
    ;

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
        console.log('data');
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

  function writeFile(logpath){
    file.writeFile('tcp', tcpBuffer, currentTcpPort, logpath, function(){tcpBuffer = '';});
  }

  function toggleLog(logpath) {
    if(!isLoggingTcp){
      isLoggingTcp = true;
      console.log('logging tcp Start');
      file.mkdir('tcp', currentTcpPort, logpath);
    }
    else{
      isLoggingTcp = false;
      if(tcpBuffer){
        //write the file
        writeFile(logpath);
      }
    }
  }
  
  function assignSocket (socket) {
    browserSocket = socket;
  }
  
  module.exports.assignSocket = assignSocket;
  module.exports.toggleLog = toggleLog;
  module.exports.writeFile = writeFile;
  module.exports.startListening = startListening;
  module.exports.closeAllSockets = closeAllSockets;
  module.exports.isLoggingTcp = isLoggingTcp;

}());
