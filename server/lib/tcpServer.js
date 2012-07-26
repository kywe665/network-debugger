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
    , currentTcpPort
    , socketOpen = false
    ;

  //Open Sockets to listen on network TCP
  function startListening (request, response) {
    var success = {}
      , date
      , filename
      ;
    success.socket = true;
    listener = net.createServer(function(listenSocket) { //'connection' listener
      var socketData = '';
      //When a new socket is opened assign it a uid and map it.
      listenSocket.id = openedConnections;
      socketMap[openedConnections] = listenSocket;
      openedConnections++;
      browserSocket.emit('connectionChange', openedConnections-closedConnections, false);

      //Event when Socket is closed
      listenSocket.on('close', function() {
        closedConnections++;
        browserSocket.send(socketData);
        browserSocket.emit('connectionChange', openedConnections-closedConnections, true);
        delete socketMap[listenSocket.id];
        if (isLoggingTcp) {
          tcpMsg[listenSocket.id] = socketData;
          browserSocket.emit('seperateFiles', 'tcp', null, listenSocket.id);
        }
      });

      //Event when data is transferred
      listenSocket.on('data', function(data) {
        socketData += data.toString();
      });
    });

    //bind the server to listen to the requested port
    listener.listen(request.params.portNum, function() { //'listening' listener
      currentTcpPort = request.params.portNum;
      success.listening = true;
      socketOpen = true;
      response.json(success);
      response.end();
    });

    //If address in use, try again
    listener.on('error', function (e) {
      if (e.code == 'EADDRINUSE') {
        response.json({"error": 'That port is already in use!'});
        response.end();
      }
      else{
        response.json({"error": e.code});
        response.end();
      }
    });
  }

  //When user requests to close the connection
  function closeAllSockets() {
    if(socketOpen){
      Object.keys(socketMap).forEach(function(socket){
        socketMap[socket].destroy();
      });
      listener.close();
      browserSocket.emit('closedConnection', currentTcpPort, 'tcp');
      socketOpen = false;
    }
  }

  function writeFile(logpath, id){
    var data = tcpMsg[id];
    delete tcpMsg[id];
    file.writeFile('tcp', data, currentTcpPort, logpath, function () {});
  }

  function toggleLog(logpath) {
    if(!isLoggingTcp){
      isLoggingTcp = true;
      file.mkdir('tcp', currentTcpPort, logpath);
    }
    else{
      isLoggingTcp = false;
      var ids = Object.keys(tcpMsg)
        , firstMsg = ids[0]
        ;

      delete ids[0];
      ids.forEach(function(id){
        tcpMsg[firstMsg] += '\r\n\r\n' + tcpMsg[id];
        delete tcpMsg[id];
      });

      writeFile(logpath, firstMsg);
    }
  }
  
  function assignSocket (socket) {
    browserSocket = socket;
  }
  
  function currentStatus() {
    return {
      "open": socketOpen,
      "port": currentTcpPort
    };
  }

  module.exports.currentStatus = currentStatus;
  module.exports.assignSocket = assignSocket;
  module.exports.toggleLog = toggleLog;
  module.exports.writeFile = writeFile;
  module.exports.startListening = startListening;
  module.exports.closeAllSockets = closeAllSockets;
  module.exports.isLoggingTcp = isLoggingTcp;

}());
