/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  
  var serverUdp
    , dgram = require('dgram')
    , isLoggingUdp = false
    , udpBuffer = ''
    , currentUdpPort
    , browserSocket
    , file = require('./file')
    ;

  function startListening (request, response) {
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

  function writeFile(logpath){
    file.writeFile('http', udpBuffer, currentUdpPort, logpath, function(){udpBuffer = '';});
  }

  function toggleLog(logpath) {
    if(!isLoggingUdp){
      isLoggingUdp = true;
      console.log('logging udp Start');
      file.mkdir('udp', currentUdpPort, logpath);
    }
    else{
      isLoggingUdp = false;
      if(udpBuffer){
        //write the file
        writeFile(logpath);
      }
    }
  }

  function close(){
    serverUdp.close();
  }

  function assignSocket (socket) {
    browserSocket = socket;
  }

  module.exports.assignSocket = assignSocket;
  module.exports.close = close;
  module.exports.toggleLog = toggleLog;
  module.exports.writeFile = writeFile;
  module.exports.startListening = startListening;

}());
