/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";
  var http = require('http')
    , url = require('url')
    , browserSocket
    , timeoutMap = {}
    ;

  function init(path, interval, id, first) {
    if(path.substring(0,7) !== 'http://'){
      path = 'http://'+path;
    }
    makeRequest(url.parse(path, true), interval, id, first);
  }

  function makeRequest(options, interval, id, first) {
    console.log('polling', options.host, interval);
    var req = http.request(options, function(res) {
      var reqHeaders = req._header
        , responseMsg = '';
      
      if(first) {
        browserSocket.emit('pollTab', id);
      }
      res.setEncoding('utf8');
      try{
        res.on('data', function (chunk) {
          responseMsg += chunk;
        });
      }
      catch(e){
        console.log('ERROR: ');
        console.log(e);
        clearInterval(timeoutMap[id]);
      }
      res.on('end', function () {
        var timeout = calculateTimeout();
        browserSocket.emit('pollData', id, res.statusCode, res.headers, responseMsg, null);
        timeoutMap[id] = setTimeout(makeRequest, interval, options, interval, id);
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
    });

    req.end();    
  }
  
  function calculateTimeout() {
    
  }

  function stopPoll(id) {
    console.log('stopped polling ' + id);
    clearInterval(timeoutMap[id]);
  }

  function assignSocket (socket) {
    browserSocket = socket;
  }

  module.exports.init = init;
  module.exports.assignSocket = assignSocket;
  module.exports.stopPoll = stopPoll;
}());


