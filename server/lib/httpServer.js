/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var connect = require('connect')
    , app = connect.createServer()
    , serverHttp = {}
    , currentHttpPort
    , browserSocket
    , isLoggingHttp = {}
    , httpBuffer = ''
    , includeHeaders = false
    , file = require('./file')
    , socketOpen = {}
    ;
  
  function startListening(request, response){
    var connectObj = connect.createServer()
      .use(getBody)
      .use(function (req, res, next){ req.params = request.params; next(); })
      .use(readHttp);
    if(serverHttp[request.params.portNum]){
      response.json({"error": 'That port is already in use!'});
      browserSocket.emit('httpData', {
          "headers": ''
        , "body": 'That port is already being used!'
        , "protocol": 'http'
      }, request.params.portNum);
      return;
    }
    serverHttp[request.params.portNum] = connectObj.listen(request.params.portNum,function(){
      response.json({"error": false});
      socketOpen[request.params.portNum] = true;
      currentHttpPort = request.params.portNum;
    });
    serverHttp[request.params.portNum].on('error', function(err) {
      browserSocket.emit('httpData', {
          "headers": ''
        , "body": 'That port is already being used!'
        , "protocol": 'http'
      }, request.params.portNum);
      if(err.code === 'EADDRINUSE'){
        response.json({"error": 'That port is already in use!'});
      }
      else{
        response.json({"error": err.code});
      }
    });
    serverHttp[request.params.portNum].on('close', function() {
      browserSocket.emit('closedConnection', request.params.portNum, 'http');
      socketOpen[request.params.portNum] = false;
      delete serverHttp[request.params.portNum];
    });
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
    }, req.params.portNum);
    if(isLoggingHttp[req.params.portNum]){
      if(includeHeaders) {
        httpBuffer += (data + req.rawBody + '\r\n\r\n');
      }
      else{
        httpBuffer += (req.rawBody + '\r\n\r\n');
      }
      browserSocket.emit('seperateFiles', 'http', req.params.portNum);
    }
    res.end('Hello from Connect!\n');
  }

  function writeFile(logpath, port){
    file.writeFile('http', httpBuffer, port, logpath, function(){ httpBuffer = ''; });
  }

  function toggleLog(logpath, port) {
    if(!isLoggingHttp[port]){
      isLoggingHttp[port] = true;
      file.mkdir('http', port, logpath);
    }
    else{
      isLoggingHttp[port] = false;
      if(httpBuffer){
        //write the file
        writeFile(logpath, port);
      }
    }
  }

  function close(port){
    if(socketOpen[port]){
      try{
        serverHttp[port].close();
      } 
      catch(e){
        console.log('critical error: ', e);
      }
    }
  }
    
  function headers(bool){
    includeHeaders = bool;
  }

  function assignSocket (socket) {
    browserSocket = socket;
  }
  function currentStatus() {
    return socketOpen;
  }

  module.exports.currentStatus = currentStatus;
  module.exports.toggleLog = toggleLog;
  module.exports.writeFile = writeFile;
  module.exports.close = close;
  module.exports.headers = headers;
  module.exports.assignSocket = assignSocket;
  module.exports.startListening = startListening;
  
}());
