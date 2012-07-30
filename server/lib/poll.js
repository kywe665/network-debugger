/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";
  var http = require('http')
    , url = require('url')
    , browserSocket
    , timeoutMap = {}
    , pollFlag = {}
    ;

  function init(path, interval, id, first) {
    if(path.substring(0,7) !== 'http://'){
      path = 'http://'+path;
    }
    makeRequest(url.parse(path, true), interval, id, first);
  }

  function makeRequest(options, interval, id, first) {
    console.log('polling', options.host, interval);
    var timeSent = Date.now()
      , req
      ;
    req = http.request(options, function(res) {
      var responseMsg = '';
      if(first) {
        browserSocket.emit('pollTab', id);
        pollFlag[id] = true;
      }
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        responseMsg += chunk;
      });
      res.on('end', function () {
        var timeout = calculateTimeout(interval, timeSent);
        console.log('timeout:', timeout);
        browserSocket.emit('pollData', id, res.statusCode, res.headers, responseMsg, null);
        timeoutMap[id] = setTimeout(pollAgain, timeout, options, interval, id);
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: ', e);
      if(first){
        var err = 'Check your url and try again: ';
        browserSocket.emit('pollData', 'default', null, null, null, err);
        return;
      }
      browserSocket.emit('pollData', 'default', null, null, null, e);
      browserSocket.emit('pollData', id, null, null, null, e);
      if(e.code === 'ECONNRESET'){
        timeoutMap[id] = setTimeout(pollAgain, interval, options, interval, id);
      }
    });

    req.on('socket', function(socket) {
      socket.on('error', function(error) {
        console.log('ERROR: ');
        console.log(error);
        browserSocket.emit('pollData', 'default', null, null, null, error);
        browserSocket.emit('pollData', id, null, null, null, error);
      });
    });

    req.end();
  }
  
  function pollAgain(options, interval, id) {
    if(pollFlag[id]){
      makeRequest(options, interval, id);
    }
    else{
      clearTimeout(timeoutMap[id]);
    }
  }
  
  function calculateTimeout(interval, timeSent) {
    var timeFinished = Date.now()
      , timeElapsed = timeFinished - timeSent
      ;
    console.log('time elapsed:', timeElapsed);
    if(timeElapsed < interval){
      return (interval - timeElapsed);
    }
    return 0;
  }

  function stopPoll(id) {
    console.log('stopped polling ' + id);
    clearTimeout(timeoutMap[id]);
    pollFlag[id] = false;
  }

  function assignSocket (socket) {
    browserSocket = socket;
  }

  module.exports.init = init;
  module.exports.assignSocket = assignSocket;
  module.exports.stopPoll = stopPoll;
}());


