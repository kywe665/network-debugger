/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * BROWSER
 */

(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , reqwest = require('reqwest')
    , window = require('window')
    , document = window.document
    , location = window.location
    , uiTabs = require('./ui-tabs')
    , io = require('socket.io-browser')
    , socketTcp
    , socketHttp
    ;
  //Create Tabs
  uiTabs.create('body', '.js-ui-tab a', '.js-ui-tab', '.js-ui-tab-view', 'http');
  
  //EVENT LISTENERS TCP
  $('.container').on('.js-tcp-clear', 'click', function(){
    $('.js-tcp-stream').html('');
  });
  $('.container').on('.js-tcp-scroll', 'change', function(){
    if($('.js-tcp-scroll').attr('checked')){
      $('.js-tcp-stream')[0].scrollTop = $('.js-tcp-stream')[0].scrollHeight;
    }
  });
  $('.container').on('.js-tcp-testSocket', 'click', function(){
    socketTcp.emit('testSocket');
  });
  $('.container').on('.js-tcp-closeSocket:not(.inactive)', 'click', function(){
    socketTcp.emit('allDone');
  });
  $('.container').on('.js-tcp-openSocket:not(.inactive)', 'click', function(){
    var options = {}
      , port = $('.js-tcp-portNum').val()
      ;
    options.msg = '';
    options.type = 'tcp';
    reqwest({
      url: 'http://'+window.location.host+'/listenTCP/'+port
    , type: 'json'
    , method: 'get'
    , error: function (err) { 
        console.log('Server Error: ', err);
        options.error = true;
        options.msg = 'Cannot communicate with netbug server';
        writeMsg(options);
      }
    , success: function (resp) {
        var html, i;
        console.log('success: ', resp);
        if(!resp.error){
          options.active = true;
          stateChange(options);
          if(resp.result.socket){
            options.msg += '<span class="css-streamNewConnection">Socket opened succesfully. ';
          }
          if(resp.result.listening){
            options.msg += 'Listening on port: '+ port +' </span>';
          }
        }
        else{
          options.error = true;
          for(i=0; i < resp.errors.length; i=i+1){
						options.msg += resp.errors[i].message;
					}
        }
        writeMsg(options);
      }
    });
    openSocket(options);
	});
  //EVENT LISTENERS HTTP
  $('.container').on('.js-http-clear', 'click', function(){
    $('.js-http-stream').html('');
  });
  $('.container').on('.js-http-scroll', 'change', function(){
    if($('.js-http-scroll').attr('checked')){
      $('.js-http-stream')[0].scrollTop = $('.js-http-stream')[0].scrollHeight;
    }
  });
  $('.container').on('.js-http-closeSocket:not(.inactive)', 'click', function(){
    socketHttp.emit('killHttp');
  });
  $('.container').on('.js-http-openSocket', 'click', function(){
     var options = {}
      , port = $('.js-http-portNum').val()
      ;
    options.msg = '';
    options.type = 'http';
    reqwest({
      url: 'http://'+window.location.host+'/listenHTTP/'+port
    , type: 'json'
    , method: 'get'
    , error: function (err) { 
        console.log('Server Error: ', err);
        options.error = true;
        options.msg = 'Cannot communicate with netbug server';
        writeMsg(options);
      }
    , success: function (resp) {
        var html, i;
        console.log('success: ', resp);
        if(!resp.error){
          options.active = true;
          stateChange(options);
          options.msg += '<span class="css-streamNewConnection">Socket opened succesfully. ';
          options.msg += 'Listening on port: '+ port +' </span>';
        }
        else{
          options.error = true;
          for(i=0; i < resp.errors.length; i=i+1){
						options.msg += resp.errors[i].message;
					}
        }
        writeMsg(options);
      }
    });
    openSocket(options);
  });
  
  function openSocket(options) {
    if(options.type === 'tcp'){
      socketTcp = io.connect('http://'+window.location.hostname+':3454');
      socketTcp.on('connect', function () {
        socketTcp.send('hi');
        socketTcp.on('message', function (msg) {
          options.msg = msg;
          socketMessage(options);
        });
        socketTcp.on('connectionChange', function (count, closed) {
          options.count = count;
          options.closed = closed;
          socketChange(options);
        });
        socketTcp.on('closedConnection', function(num){
          options.num = num;
          socketClosed(options);
        });
        socketTcp.on('disconnect', function () { 
          socketDisconnect(options);
        });
      });
    }
    else if(options.type === 'http') {
      socketHttp = io.connect('http://'+window.location.hostname+':3454');
      socketHttp.on('connect', function () {
        socketHttp.send('hi');
        socketHttp.on('message', function (msg) {
          options.msg = msg;
          socketMessage(options);
        });
        socketHttp.on('connectionChange', function (count, closed) {
          options.count = count;
          options.closed = closed;
          socketChange(options);
        });
        socketHttp.on('closedConnection', function(num){
          options.num = num;
          socketClosed(options);
        });
        socketHttp.on('disconnect', function () { 
          socketDisconnect(options);
        });
      });
    }
  }
  function socketMessage(options){
    console.log(options.msg);
    writeMsg(options);
  }
  function socketChange(options){
    console.log('newConn '+ options.count);
    $('.js-'+options.type+'-connection-count').html(options.count);
    if(options.closed){
      options.msg = '<span class="css-streamCloseConnection">Socket Closed</span>';
    }
    else{
      options.msg = '<span class="css-streamNewConnection">New Socket Opened</span>';
    }
    writeMsg(options);
  }
  function socketClosed(options){
    options.msg = '<span class="css-streamCloseConnection">Closed Connection on '+options.num+'</span>';
    stateChange({
      active: false,
      type: 'http'
    });
    writeMsg(options);
  }
  function socketDisconnect(options){
    console.log('Browser-Disconnected socket');
    options.error = true;
    options.msg = 'NetBug Server Down';
    writeMsg(options);
    options.active = false;
    stateChange(options);
  }

  function stateChange(options){
    if(options.active){
      $('.js-'+options.type+'-openSocket').addClass('inactive');
      $('.js-'+options.type+'-closeSocket').removeClass('inactive');
      $('.js-'+options.type+'-connection-status').removeClass('off');
      $('.js-'+options.type+'-connection-count').html('0');
    }
    else{
      $('.js-'+options.type+'-openSocket').removeClass('inactive');
      $('.js-'+options.type+'-closeSocket').addClass('inactive');
      $('.js-'+options.type+'-connection-status').addClass('off');
      $('.js-'+options.type+'-connection-count').html('0');
    }
  }

  function writeMsg(options) {
    var timeStamp = new Date()
      , msg = $('.js-'+options.type+'-stream').html();
    msg += '<span class="css-streamTime">'+timeStamp.toString()+'</span><br/>';
    if (options.error){
      msg += '<span class="css-streamError">'+options.msg+'</span>';
    }
    else{
      msg += options.msg;
    }
		$('.js-'+options.type+'-stream').html(msg+'<br/>');
		options.error = false;
		options.msg = '';
    if($('.js-'+options.type+'-scroll').attr('checked')){
      $('.js-'+options.type+'-stream')[0].scrollTop = $('.js-'+options.type+'-stream')[0].scrollHeight;
    }
  }

  function init() {

  }
  
   module.exports.init = init;
}());


