/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var fs = require('fs.extra')
    , path = require('path')
    ;

  function writeFile(protocol, buffer, port, logpath, callback) {
    var date = new Date()
      , filename
      , ext = '.txt'
      ;
    if(buffer.indexOf("<kml") != -1){
      ext = '.kml';
    }
    filename = date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()+'_'+(date.getMonth()+1)+'-'+date.getDate()+'-'+date.getFullYear();
    fs.writeFile(path.join(logpath, protocol, port, filename+'.txt'), buffer
    , function (err) {
        if (err) throw err;
        callback();
      })
    ;
  }
  
  //Make directory for logger
  function mkdir(protocol, port, logpath) {
    fs.mkdirp(path.join(logpath, protocol, port));
  }
  
  module.exports.mkdir = mkdir;
  module.exports.writeFile = writeFile;

}());
