/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var fs = require('fs')
    , mkdirp = require('mkdirp')
    , path = require('path')
    ;

  function writeFile(protocol, buffer, port, logpath, callback) {
    var date = new Date()
      , filename
      , ext = '.txt'
      , hours = ('0'+date.getHours()).slice(-2)
      , minutes = ('0'+date.getMinutes()).slice(-2)
      , seconds = ('0'+date.getSeconds()).slice(-2)
      , milliseconds = ('00'+date.getMilliseconds()).slice(-3)
      , month = ('0'+(date.getMonth()+1)).slice(-2)
      , day = ('0'+date.getDate()).slice(-2)
      , year = date.getFullYear()
      ;
    if(buffer.indexOf("<kml") != -1){
      ext = '.kml';
    }
    filename = year+'-'+month+'-'+day+'_'+hours+'-'+minutes+'-'+seconds+'-'+milliseconds;
    if(!buffer){
      callback();
      return;
    }
    fs.writeFile(path.join(logpath, protocol, port, filename+ext), buffer
    , function (err) {
        if (err) throw err;
        callback();
      })
    ;
  }
  
  //Make directory for logger
  function mkdir(protocol, port, logpath) {
    mkdirp(path.join(logpath, protocol, port));
  }
  
  module.exports.mkdir = mkdir;
  module.exports.writeFile = writeFile;

}());
