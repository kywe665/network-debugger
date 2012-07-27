/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";
  var http = require('http')
    , url = require('url')
    , browserSocket
    , intervalMap = {}
    ;

  function init(path, interval, id, first) {
    console.log('starting poll', path, interval);
    var options = url.parse(path, true)
      , req
      ;

    req = http.request(options, function(res) {
      var reqHeaders = req._header
        , responseMsg = '';
      
      if(first) {
        browserSocket.emit('pollTab', id);
      }
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        responseMsg += chunk;
      });
      res.on('end', function () {
        browserSocket.emit('pollData', id, res.statusCode, res.headers, responseMsg, null);
        if(first) {
          intervalMap[id] = setInterval(init, interval, path, interval, id);
        }
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: ', e);
      browserSocket.emit('pollData', id, null, null, null, e);
    });

    req.end();
  }

  function stopPoll(id) {
    console.log('stopped polling ' + id);
    clearInterval(intervalMap[id]);
  }

  function assignSocket (socket) {
    browserSocket = socket;
  }

  module.exports.init = init;
  module.exports.assignSocket = assignSocket;
  module.exports.stopPoll = stopPoll;
}());
